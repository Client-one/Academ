import "server-only";
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
 * (no service role). Safe two-phase commit: insert row → upload file →
 * update path; on failure, clean up both sides.
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
  const { data: item } = await params.client
    .from("content_items")
    .select("id, course_id")
    .eq("id", params.contentItemId)
    .maybeSingle();
  if (!item) return { ok: false, error: "عنوان المحتوى غير موجود." };

  // material_kind ↔ file-type consistency: the chosen kind code (from the
  // client) must accept the file's DETECTED signature, so a tampered client
  // cannot upload e.g. an image under a "PDF" kind.
  const { data: kindRow } = await params.client
    .from("material_kinds")
    .select("code")
    .eq("id", params.materialKindId)
    .maybeSingle();
  if (!kindRow) return { ok: false, error: "نوع المادة غير موجود." };
  if (!fileKindAllowedForMaterialKind((kindRow as { code: string }).code, detected)) {
    return { ok: false, error: "نوع الملف لا يتوافق مع نوع المادة المحدد." };
  }

  // Phase 1 — create the DB record in an explicit pending state.
  // storage_path stays NULL (never a "pending" placeholder string) and the
  // row is forced to draft by the lifecycle CHECK until the upload finishes.
  const ext = params.file.name.split(".").pop()!.toLowerCase();
  const { data: created, error: insertError } = await params.client
    .from("content_materials")
    .insert({
      content_item_id: params.contentItemId,
      material_kind_id: params.materialKindId,
      title: params.title,
      description: params.description,
      storage_path: null,
      upload_status: "pending",
      status: "draft",
      created_by: params.adminProfileId,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    logError("material_record_create_failed", { message: insertError?.message });
    return { ok: false, error: "تعذر إنشاء سجل المادة." };
  }

  const materialId = (created as { id: string }).id;
  const storagePath = `${item.course_id}/${params.contentItemId}/${materialId}.${ext}`;

  // Phase 2 — upload to private Storage. On failure: delete the DB record so
  // no incomplete material remains (no orphan row, no file was stored).
  const { error: uploadError } = await params.client.storage
    .from("content-files")
    .upload(storagePath, bytes, { contentType: mimeForKind(detected), upsert: false });

  if (uploadError) {
    await params.client.from("content_materials").delete().eq("id", materialId);
    logError("material_upload_failed", { message: uploadError.message });
    return { ok: false, error: "فشل رفع الملف. لم يتم حفظ أي سجل." };
  }

  // Phase 3 — finalize the record. On failure: remove the uploaded file
  // (no orphan object) AND delete the record (no half-complete material).
  const { data: finalized, error: updateError } = await params.client
    .from("content_materials")
    .update({ storage_path: storagePath, upload_status: "ready" })
    .eq("id", materialId)
    .eq("upload_status", "pending")
    .select("id");

  if (updateError || !finalized || finalized.length === 0) {
    const { error: cleanupError } = await params.client.storage
      .from("content-files")
      .remove([storagePath]);
    if (cleanupError) {
      // Orphaned object — record it for manual cleanup, never silently.
      logError("material_orphan_file_cleanup_failed", { message: cleanupError.message });
    }
    await params.client.from("content_materials").delete().eq("id", materialId);
    if (updateError) logError("material_finalize_failed", { message: updateError.message });
    return { ok: false, error: "تعذر حفظ بيانات الملف. تم التراجع عن الرفع بالكامل." };
  }

  return { ok: true, materialId };
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
