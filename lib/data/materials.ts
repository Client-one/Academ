import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseArticle } from "@/lib/articles/schema";
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
import { isConsistentUploadState } from "@/lib/data/upload-state";
import type { ContentMaterial, Status } from "@/lib/types";

const SIGNED_URL_TTL_SECONDS = 60;

export type DownloadResult =
  | { ok: true; url: string; filename: string }
  | { ok: false; status: "unauthorized" | "not_found" };

const DOWNLOAD_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png", "webp"]);

/**
 * Safe download file name: the material title plus the stored file's
 * (allowlisted) extension. Only letters (Arabic included), digits, marks,
 * spaces and `._()-` survive — no path separators, quotes, control or
 * bidi-override characters can reach the Content-Disposition header.
 */
export function buildDownloadFilename(title: string, storagePath: string): string {
  const rawExt = storagePath.split(".").pop()?.toLowerCase() ?? "";
  const ext = DOWNLOAD_EXTENSIONS.has(rawExt) ? rawExt : "pdf";
  const base = title
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\p{M} ._()-]/gu, "")
    .replace(/\s+/g, " ")
    .replace(/^[ .]+|[ .]+$/g, "")
    .slice(0, 80)
    .trim();
  return `${base || "material"}.${ext}`;
}

/**
 * Authorize a STUDENT download and mint a short-lived signed URL.
 *
 * Full chain authorization (published course + item + material, and the
 * course must belong to the student's own semester) is enforced here even
 * though RLS already filters, so a forged ID can never bypass it. Only
 * materials with a finished file upload are downloadable. The URL is built
 * with a `download` file name so Storage answers with
 * Content-Disposition: attachment (never inline), expires after
 * SIGNED_URL_TTL_SECONDS, and is never persisted or shown in the UI.
 * The internal storage path never leaves this function.
 */
export async function getMaterialDownloadForStudent(
  client: SupabaseClient,
  materialId: string,
  studentSemesterId: string
): Promise<DownloadResult> {
  const { data: material, error } = await client
    .from("content_materials")
    .select("*, content_items!inner(status, course_id, courses!inner(status, semester_id))")
    .eq("id", materialId)
    .maybeSingle();

  if (error) {
    logError("material_download_lookup_failed", { code: error.code, message: error.message });
    return { ok: false, status: "not_found" };
  }
  if (!material) return { ok: false, status: "not_found" };

  const row = material as Record<string, unknown>;
  const item = row.content_items as unknown as { status: string; courses: { status: string; semester_id: string } };
  const course = item.courses;
  const m = row as unknown as ContentMaterial;

  if (
    !chainAllowsStudent(course.status as Status, item.status as Status, m.status) ||
    course.semester_id !== studentSemesterId
  ) {
    return { ok: false, status: "unauthorized" };
  }

  // Only a finished file upload with a real path is downloadable
  // (article-only / pending / inconsistent rows are not).
  if (
    m.upload_status !== "ready" ||
    !m.storage_path ||
    !isConsistentUploadState(m.upload_status, m.storage_path, m.article != null, m.status)
  ) {
    return { ok: false, status: "not_found" };
  }

  const filename = buildDownloadFilename(m.title, m.storage_path);
  // NOTE: the `download` option of createSignedUrl() is NOT used: storage-js
  // runs encodeURI() over an already-encoded query string, so any non-ASCII
  // (Arabic) file name arrives double-encoded and the browser would save the
  // file as "%D9%85%D8%AD...". The name is appended here with a single,
  // correct encoding instead; the signed token does not cover the query.
  const { data: signed, error: signError } = await client.storage
    .from("content-files")
    .createSignedUrl(m.storage_path, SIGNED_URL_TTL_SECONDS);
  if (signError || !signed?.signedUrl) {
    logError("signed_url_failed", { materialId, message: signError?.message });
    return { ok: false, status: "not_found" };
  }
  const url = new URL(signed.signedUrl);
  url.searchParams.set("download", filename);
  return { ok: true, url: url.toString(), filename };
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
