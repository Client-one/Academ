"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/security/guards";
import { moveItem } from "@/lib/data/academics";
import { logError } from "@/lib/security/logger";
import { isStudentVisibleState } from "@/lib/data/upload-state";
import type { UploadStatus } from "@/lib/types";

/**
 * Verify a parent object exists (admin session + RLS). URL/client-supplied
 * IDs are inputs only — never proof of a valid academic relationship.
 */
async function parentExists(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  table: "levels" | "semesters" | "courses",
  id: string
): Promise<boolean> {
  const { data, error } = await supabase.from(table).select("id").eq("id", id).maybeSingle();
  if (error) {
    logError("parent_lookup_failed", { table, message: error.message });
    return false;
  }
  return !!data;
}
import {
  contentItemSchema,
  courseSchema,
  levelSchema,
  moveSchema,
  semesterSchema,
  setStatusSchema,
  type ActionResult,
} from "@/lib/validation/schemas";

export async function upsertLevelAction(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = levelSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  if (parsed.data.id) {
    const { error } = await supabase.from("levels").update({ name: parsed.data.name }).eq("id", parsed.data.id);
    if (error) return { error: "تعذر تحديث المستوى." };
  } else {
    const { data: max } = await supabase.from("levels").select("order_index").order("order_index", { ascending: false }).limit(1);
    const next = ((max?.[0] as { order_index: number } | undefined)?.order_index ?? 0) + 1;
    const { error } = await supabase.from("levels").insert({ name: parsed.data.name, order_index: next });
    if (error) return { error: "تعذر إنشاء المستوى (الاسم قد يكون مكرراً)." };
  }
  revalidatePath("/admin/levels");
  return { success: "تم الحفظ." };
}

export async function upsertSemesterAction(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = semesterSchema.safeParse({
    id: formData.get("id") || undefined,
    level_id: formData.get("level_id"),
    name: formData.get("name"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  if (!(await parentExists(supabase, "levels", parsed.data.level_id))) {
    return { error: "المستوى المحدد غير موجود." };
  }

  if (parsed.data.id) {
    const { error } = await supabase.from("semesters").update({ name: parsed.data.name }).eq("id", parsed.data.id);
    if (error) return { error: "تعذر تحديث الفصل." };
  } else {
    const { data: max } = await supabase
      .from("semesters").select("order_index")
      .eq("level_id", parsed.data.level_id)
      .order("order_index", { ascending: false }).limit(1);
    const next = ((max?.[0] as { order_index: number } | undefined)?.order_index ?? 0) + 1;
    const { error } = await supabase
      .from("semesters")
      .insert({ level_id: parsed.data.level_id, name: parsed.data.name, order_index: next });
    if (error) return { error: "تعذر إنشاء الفصل (الاسم قد يكون مكرراً في نفس المستوى)." };
  }
  revalidatePath("/admin/semesters");
  return { success: "تم الحفظ." };
}

export async function upsertCourseAction(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = courseSchema.safeParse({
    id: formData.get("id") || undefined,
    semester_id: formData.get("semester_id"),
    name: formData.get("name"),
    code: formData.get("code"),
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  if (!(await parentExists(supabase, "semesters", parsed.data.semester_id))) {
    return { error: "الفصل المحدد غير موجود." };
  }

  if (parsed.data.id) {
    const { error } = await supabase
      .from("courses")
      .update({ name: parsed.data.name, code: parsed.data.code, description: parsed.data.description })
      .eq("id", parsed.data.id);
    if (error) return { error: "تعذر تحديث المقرر." };
  } else {
    const { data: max } = await supabase
      .from("courses").select("order_index")
      .eq("semester_id", parsed.data.semester_id)
      .order("order_index", { ascending: false }).limit(1);
    const next = ((max?.[0] as { order_index: number } | undefined)?.order_index ?? 0) + 1;
    const { error } = await supabase
      .from("courses")
      .insert({ ...parsed.data, order_index: next, status: "draft" });
    if (error) return { error: "تعذر إنشاء المقرر (الرمز قد يكون مكرراً في نفس الفصل)." };
  }
  revalidatePath("/admin/courses");
  return { success: "تم الحفظ." };
}

export async function upsertContentItemAction(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = contentItemSchema.safeParse({
    id: formData.get("id") || undefined,
    course_id: formData.get("course_id"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  if (!(await parentExists(supabase, "courses", parsed.data.course_id))) {
    return { error: "المقرر المحدد غير موجود." };
  }

  if (parsed.data.id) {
    const { error } = await supabase
      .from("content_items")
      .update({ title: parsed.data.title, description: parsed.data.description })
      .eq("id", parsed.data.id);
    if (error) return { error: "تعذر تحديث المحور." };
  } else {
    const { data: max } = await supabase
      .from("content_items").select("order_index")
      .eq("course_id", parsed.data.course_id)
      .order("order_index", { ascending: false }).limit(1);
    const next = ((max?.[0] as { order_index: number } | undefined)?.order_index ?? 0) + 1;
    const { error } = await supabase
      .from("content_items")
      .insert({ ...parsed.data, order_index: next, status: "draft" });
    if (error) return { error: "تعذر إنشاء المحور." };
  }
  revalidatePath("/admin/content");
  return { success: "تم الحفظ." };
}

// Only tables that actually have a `status` column (levels/semesters don't).
const TABLE_BY_KIND: Record<string, string> = {
  course: "courses",
  content_item: "content_items",
  material: "content_materials",
};

export async function setStatusAction(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = setStatusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: "طلب غير صالح." };

  const table = TABLE_BY_KIND[String(formData.get("kind"))];
  if (!table) return { error: "نوع غير معروف." };

  // A material can be published only when it actually has content for the
  // student: a finished file upload or an attached article.
  if (table === "content_materials" && parsed.data.status === "published") {
    const { data: material, error: lookupError } = await supabase
      .from("content_materials")
      .select("upload_status, article")
      .eq("id", parsed.data.id)
      .maybeSingle();
    if (lookupError) {
      logError("material_status_lookup_failed", { message: lookupError.message });
      return { error: "تعذر التحقق من المادة." };
    }
    const m = material as { upload_status: UploadStatus; article: unknown } | null;
    if (!m) return { error: "المادة غير موجودة." };
    if (!isStudentVisibleState(m.upload_status, m.article != null)) {
      return { error: "لا يمكن نشر مادة لم يكتمل رفع ملفها ولا تحتوي نسخة قراءة." };
    }
  }

  const { error } = await supabase.from(table).update({ status: parsed.data.status }).eq("id", parsed.data.id);
  if (error) {
    logError("set_status_failed", { table, message: error.message });
    return { error: "تعذر تحديث الحالة." };
  }

  revalidatePath("/admin");
  return { success: "تم تحديث حالة النشر." };
}

export async function moveAction(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = moveSchema.safeParse({
    kind: formData.get("kind"),
    id: formData.get("id"),
    delta: Number(formData.get("delta")),
  });
  if (!parsed.success) return { error: "طلب غير صالح." };

  const result = await moveItem(supabase, parsed.data);
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin");
  return { success: "تم إعادة الترتيب." };
}
