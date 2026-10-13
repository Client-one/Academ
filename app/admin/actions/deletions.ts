"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/security/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { logError } from "@/lib/security/logger";
import { idSchema, type ActionResult } from "@/lib/validation/schemas";

const TABLE_BY_KIND = {
  level: "levels",
  semester: "semesters",
  course: "courses",
  content_item: "content_items",
  material: "content_materials",
} as const;

type Kind = keyof typeof TABLE_BY_KIND;

const BLOCKED_MESSAGE: Record<Kind, string> = {
  level: "لا يمكن حذف مستوى يحتوي على فصول. احذف الفصول أولاً.",
  semester: "لا يمكن حذف فصل يحتوي على مقررات أو طلاب. احذف المقررات وانقل الطلاب أولاً.",
  course: "لا يمكن حذف مقرر يحتوي على محاور. احذف المحاور أولاً.",
  content_item: "لا يمكن حذف محور يحتوي على مواد. احذف المواد أولاً.",
  material: "تعذر حذف المادة.",
};

/**
 * Delete one academic object. Authorization is enforced twice: requireAdmin()
 * here and the admin-only DELETE policy in the database (migration 0006).
 * Foreign keys are RESTRICT, so a non-empty parent can never be deleted.
 */
export async function deleteEntityAction(kind: Kind, id: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const table = TABLE_BY_KIND[kind];
  const parsed = idSchema.safeParse({ id });
  if (!table || !parsed.success) return { error: "طلب غير صالح." };

  // A material may own a file: remember its path before the row is gone.
  let storagePath: string | null = null;
  if (kind === "material") {
    const { data: row, error: lookupError } = await supabase
      .from("content_materials")
      .select("storage_path")
      .eq("id", parsed.data.id)
      .maybeSingle();
    if (lookupError) {
      logError("delete_material_lookup_failed", { message: lookupError.message });
      return { error: "تعذر التحقق من المادة." };
    }
    if (!row) return { error: "المادة غير موجودة." };
    storagePath = (row as { storage_path: string | null }).storage_path;
  }

  const { data: removed, error } = await supabase
    .from(table)
    .delete()
    .eq("id", parsed.data.id)
    .select("id");

  if (error) {
    // 23503 = foreign_key_violation (RESTRICT): the object is not empty.
    if (error.code === "23503") return { error: BLOCKED_MESSAGE[kind] };
    logError("delete_entity_failed", { table, code: error.code, message: error.message });
    return { error: "تعذر الحذف." };
  }
  if (!removed || removed.length === 0) {
    // Nothing deleted and no error: row missing OR no DELETE policy yet.
    return { error: "لم يتم الحذف. تأكد من تطبيق ملف migration رقم 0006 في Supabase." };
  }

  // Row first, file second: a failure here leaves an unreachable private
  // object (logged for cleanup), never a record pointing at a missing file.
  if (storagePath) {
    const { data: files, error: storageError } = await supabase.storage
      .from("content-files")
      .remove([storagePath]);
    if (storageError || !files || files.length !== 1) {
      logError("delete_material_orphan_object", {
        storagePath,
        message: storageError?.message,
        removedCount: files?.length ?? 0,
      });
    }
  }

  revalidatePath("/admin", "layout");
  return { success: "تم الحذف." };
}

/** Permanently delete a STUDENT account (never an admin). */
export async function deleteStudentAction(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = idSchema.safeParse({ id });
  if (!parsed.success) return { error: "معرّف غير صالح." };

  const { data: target } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!target || (target as { role: string }).role !== "student") {
    return { error: "الطالب غير موجود." };
  }

  // Deleting the Auth user also removes the profile (ON DELETE CASCADE) and
  // invalidates every session. Service role is used only for this call.
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(parsed.data.id);
  if (error) {
    logError("delete_student_failed", { message: error.message });
    return { error: "تعذر حذف حساب الطالب." };
  }

  revalidatePath("/admin/students");
  return { success: "تم حذف الطالب." };
}
