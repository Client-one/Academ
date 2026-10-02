import type { Status, UploadStatus } from "@/lib/types";

/**
 * Upload lifecycle semantics for content_materials (pure, unit-testable;
 * the same invariants are enforced in the DB by
 * content_materials_upload_lifecycle_chk):
 *
 *   ready   — file upload finished; storage_path IS a real object path.
 *   none    — no file upload was ever attempted; the material is
 *             article-only, so an article MUST exist.
 *   pending — upload in progress; storage_path IS NULL and the row must
 *             stay draft (never visible to students).
 */
export function isConsistentUploadState(
  uploadStatus: UploadStatus,
  storagePath: string | null,
  hasArticle: boolean,
  status: Status
): boolean {
  switch (uploadStatus) {
    case "ready":
      // A ready file material always has a real storage path.
      return storagePath !== null;
    case "none":
      // Article-only: no file, but an article must exist.
      return storagePath === null && hasArticle;
    case "pending":
      // Incomplete upload: no path, and must not be published.
      return storagePath === null && status === "draft";
    default:
      return false;
  }
}

/**
 * Student visibility rule (mirrors the RLS select policy):
 * a material is visible iff it has an article OR a finished file upload.
 */
export function isStudentVisibleState(
  uploadStatus: UploadStatus,
  hasArticle: boolean
): boolean {
  return hasArticle || uploadStatus === "ready";
}
