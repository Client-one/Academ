import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseArticle, type Article } from "@/lib/articles/schema";
import {
  validateUpload,
  mimeForKind,
  fileKindAllowedForMaterialKind,
  type DetectedKind,
} from "@/lib/security/file-validation";
import { articleUploadSchema } from "@/lib/validation/schemas";
import { logError } from "@/lib/security/logger";
import { insertWithNextOrderIndex, type DbError } from "@/lib/data/ordering";
import { describeDbInsertError, describeStorageError } from "@/lib/data/upload-errors";
import { isConsistentUploadState, isStudentVisibleState } from "@/lib/data/upload-state";
import type { ContentMaterial, Status } from "@/lib/types";

const SIGNED_URL_TTL_SECONDS = 120;

export type ReadMaterialResult =
  | {
      ok: true;
      material: ContentMaterial;
      kindCode: string;
      article: Article | null;
      fileUrl: string | null;
    }
  | { ok: false; status: "unauthorized" | "not_found" };

/**
 * Fetch one material for a STUDENT with full chain authorization
 * (published course+item+material, and the course must belong to the
 * student's own semester — enforced again here, even though RLS already
 * filters, so a forged ID can never bypass).
 */
export async function getMaterialForStudent(
  client: SupabaseClient,
  materialId: string,
  studentSemesterId: string
): Promise<ReadMaterialResult> {
  const { data: material, error } = await client
    .from("content_materials")
    .select("*, material_kinds(code), content_items!inner(status, course_id, courses!inner(status, semester_id))")
    .eq("id", materialId)
    .maybeSingle();

  if (error) {
    logError("material_read_failed", { message: error.message });
    return { ok: false, status: "not_found" };
  }
  if (!material) return { ok: false, status: "not_found" };

  const row = material as Record<string, unknown>;
  const kind = row.material_kinds as { code: string };
  const item = row.content_items as unknown as { status: string; courses: { status: string; semester_id: string } };
  const course = item.courses;

  if (
    !chainAllowsStudent(
      course.status as Status,
      item.status as Status,
      row.status as Status
    ) ||
    course.semester_id !== studentSemesterId
  ) {
    return { ok: false, status: "unauthorized" };
  }

  const { content_items: _ci, material_kinds: _mk, ...rest } = row;
  const clean = rest as unknown as ContentMaterial;

  // Upload-state invariants (defense in depth on top of the DB CHECK):
  // reject impossible combinations like ready with a NULL storage_path.
  if (
    !isConsistentUploadState(
      clean.upload_status,
      clean.storage_path,
      clean.article != null,
      clean.status
    )
  ) {
    logError("material_inconsistent_upload_state", { id: clean.id });
    return { ok: false, status: "not_found" };
  }

  // A material whose file upload never finished (no article either) is not
  // viewable, even if it were somehow published.
  if (!isStudentVisibleState(clean.upload_status, clean.article != null)) {
    return { ok: false, status: "not_found" };
  }

  let article: Article | null = null;
  if (clean.article) {
    // Article JSON was validated on upload; re-validate defensively at read time.
    const parsed = parseArticle(JSON.stringify(clean.article));
    article = parsed.ok ? parsed.article : null;
  }

  let fileUrl: string | null = null;
  if (clean.storage_path) {
    const { data: signed, error } = await client.storage
      .from("content-files")
      .createSignedUrl(clean.storage_path, SIGNED_URL_TTL_SECONDS);
    if (error || !signed?.signedUrl) {
      logError("signed_url_failed", { message: error?.message });
      return { ok: false, status: "not_found" };
    }
    fileUrl = signed.signedUrl;
  }

  return { ok: true, material: clean, kindCode: kind.code, article, fileUrl };
}

export type UploadResult = { ok: true; materialId: string } | { ok: false; error: string };

/**
 * Upload a file material using the ADMIN SESSION + Storage RLS policies
 * (no service role).
 *
 * Order of operations (chosen so that NO step ever needs to DELETE a
 * content_materials row — the table has no DELETE policy, so a row-delete
 * rollback silently affects 0 rows and would leave an orphan "pending" row):
 *
 *   1. Validate bytes / kind / parents (nothing written yet).
 *   2. Upload the object to a path built from a freshly generated material id.
 *      Failure here => nothing exists anywhere; just report.
 *   3. Insert the finished row in ONE statement (storage_path set,
 *      upload_status 'ready', status 'draft') with a safe order_index.
 *      Failure here => remove the uploaded object and VERIFY the removal
 *      (Storage returns the removed objects; an empty list means RLS/other
 *      denial, not success). An object that could not be removed is logged
 *      as an orphan for manual cleanup — never silently.
 */
export async function uploadMaterialFile(params: {
  client: SupabaseClient; // admin-session client
  contentItemId: string;
  materialKindId: string;
  title: string;
  description: string;
  file: File;
  adminProfileId: string;
}): Promise<UploadResult> {
  const bytes = new Uint8Array(await params.file.arrayBuffer());
  const check = validateUpload({ name: params.file.name, size: params.file.size }, bytes);
  if (!check.ok) return { ok: false, error: check.error };
  const detected = check.kind as DetectedKind;

  // Ownership: the content item must exist (RLS admin read) and belong to a real course.
  const { data: item, error: itemError } = await params.client
    .from("content_items")
    .select("id, course_id")
    .eq("id", params.contentItemId)
    .maybeSingle();
  if (itemError) {
    logError("material_item_lookup_failed", { code: itemError.code, message: itemError.message });
    return { ok: false, error: "تعذر التحقق من محور المحتوى. حاول مرة أخرى." };
  }
  if (!item) return { ok: false, error: "عنوان المحتوى غير موجود." };

  // material_kind ↔ file-type consistency: the chosen kind code (from the
  // client) must accept the file's DETECTED signature, so a tampered client
  // cannot upload e.g. an image under a "PDF" kind.
  const { data: kindRow, error: kindError } = await params.client
    .from("material_kinds")
    .select("code")
    .eq("id", params.materialKindId)
    .maybeSingle();
  if (kindError) {
    logError("material_kind_lookup_failed", { code: kindError.code, message: kindError.message });
    return { ok: false, error: "تعذر التحقق من نوع المادة. حاول مرة أخرى." };
  }
  if (!kindRow) return { ok: false, error: "نوع المادة غير موجود." };
  if (!fileKindAllowedForMaterialKind((kindRow as { code: string }).code, detected)) {
    return { ok: false, error: "نوع الملف لا يتوافق مع نوع المادة المحدد." };
  }

  // The extension was validated against the allowlist by validateUpload.
  const ext = params.file.name.split(".").pop()!.toLowerCase();
  const materialId = randomUUID();
  const storagePath = `${(item as { course_id: string }).course_id}/${params.contentItemId}/${materialId}.${ext}`;

  // Step 2 — upload the object (nothing in the DB yet).
  const { data: uploaded, error: uploadError } = await params.client.storage
    .from("content-files")
    .upload(storagePath, bytes, { contentType: mimeForKind(detected), upsert: false });
  if (uploadError || !uploaded) {
    logError("material_upload_failed", {
      materialId,
      status: (uploadError as { statusCode?: string } | null)?.statusCode,
      message: uploadError?.message,
    });
    return { ok: false, error: describeStorageError(uploadError ?? {}) };
  }

  // Step 3 — one atomic insert of the finished record.
  const inserted = await insertWithNextOrderIndex<{ id: string }>({
    client: params.client,
    table: "content_materials",
    parentColumn: "content_item_id",
    parentId: params.contentItemId,
    insert: (orderIndex) =>
      params.client
        .from("content_materials")
        .insert({
          id: materialId,
          content_item_id: params.contentItemId,
          material_kind_id: params.materialKindId,
          title: params.title,
          description: params.description,
          storage_path: storagePath,
          upload_status: "ready",
          status: "draft",
          order_index: orderIndex,
          created_by: params.adminProfileId,
        })
        .select("id")
        .single() as unknown as PromiseLike<{ data: { id: string } | null; error: DbError | null }>,
  });

  if (inserted.error || !inserted.data) {
    logError("material_record_create_failed", {
      materialId,
      attempts: inserted.attempts,
      code: inserted.error?.code,
      message: inserted.error?.message,
    });
    await removeUploadedObject(params.client, storagePath, materialId);
    return {
      ok: false,
      error: describeDbInsertError(inserted.error ?? {}) + " لم يُحفظ الملف.",
    };
  }

  return { ok: true, materialId };
}

/** Removes an uploaded object and verifies it actually went away. */
async function removeUploadedObject(
  client: SupabaseClient,
  storagePath: string,
  materialId: string
): Promise<boolean> {
  const { data: removed, error } = await client.storage.from("content-files").remove([storagePath]);
  if (error || !removed || removed.length !== 1) {
    // Orphaned object: either the call failed or Storage removed nothing
    // (e.g. policy denial returns an empty list, not an error).
    logError("material_orphan_file_cleanup_failed", {
      materialId,
      removedCount: removed?.length ?? 0,
      message: error?.message,
    });
    return false;
  }
  return true;
}

/**
 * Update a material's self-service metadata (title/description) via the
 * ADMIN session + RLS. Verifies the row actually got updated (a zero-row
 * result means nonexistent id or RLS denial — reported as an error, never
 * a silent success).
 */
export async function updateMaterialMetadata(params: {
  client: SupabaseClient;
  materialId: string;
  title: string;
  description: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { data: updated, error } = await params.client
    .from("content_materials")
    .update({ title: params.title, description: params.description })
    .eq("id", params.materialId)
    .select("id");
  if (error) {
    logError("material_update_failed", { message: error.message });
    return { ok: false, error: "تعذر تحديث المادة." };
  }
  if (!updated || updated.length === 0) {
    return { ok: false, error: "المادة غير موجودة أو غير مصرح بتعديلها." };
  }
  return { ok: true };
}

/**
 * Student-facing publication chain rule (defense in depth on top of RLS):
 * a material is reachable only when it AND every ancestor are published.
 * Pure function so the four publication states can be unit-tested.
 */
export function chainAllowsStudent(
  courseStatus: Status,
  itemStatus: Status,
  materialStatus: Status
): boolean {
  return (
    courseStatus === "published" &&
    itemStatus === "published" &&
    materialStatus === "published"
  );
}

/**
 * Attach a validated article (JSON text) to an existing material.
 * Uses the ADMIN SESSION + RLS only (no service role).
 *
 * Order of checks (fail fast, never a false success):
 *  1. Validate material_id + payload with the existing Zod schema.
 *  2. Validate article JSON with the existing Zod article schema.
 *  3. Verify the target material exists (readable => caller is admin via RLS).
 *  4. UPDATE ... SELECT and verify a row actually came back — a zero-row
 *     result (nonexistent id or RLS denial) is an error, not a success.
 */
export async function attachArticle(params: {
  client: SupabaseClient;
  materialId: string;
  jsonText: string;
}): Promise<{ ok: boolean; error?: string }> {
  const input = articleUploadSchema.safeParse({
    material_id: params.materialId,
    json: params.jsonText,
  });
  if (!input.success) {
    return { ok: false, error: "معرّف المادة غير صالح أو البيانات مفقودة." };
  }

  const parsed = parseArticle(input.data.json);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const { data: existing } = await params.client
    .from("content_materials")
    .select("id")
    .eq("id", input.data.material_id)
    .maybeSingle();
  if (!existing) return { ok: false, error: "المادة غير موجودة." };

  const { data: updated, error } = await params.client
    .from("content_materials")
    .update({ article: parsed.article })
    .eq("id", input.data.material_id)
    .select("id");

  if (error) return { ok: false, error: "تعذر حفظ المقال (تحقق من الصلاحيات)." };
  if (!updated || updated.length === 0) {
    return { ok: false, error: "لم يتم تحديث أي سجل — المادة غير موجودة أو غير مصرح بتعديلها." };
  }
  return { ok: true };
}
