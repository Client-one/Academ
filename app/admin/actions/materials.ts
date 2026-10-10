"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/security/guards";
import { attachArticle, updateMaterialMetadata, uploadMaterialFile } from "@/lib/data/materials";
import { MAX_SERVER_UPLOAD_BYTES } from "@/lib/security/file-validation";
import { logError } from "@/lib/security/logger";
import { materialSchema, materialUpdateSchema, type ActionResult } from "@/lib/validation/schemas";

function formatMb(bytes: number): string {
  return (bytes / 1_000_000).toString();
}

export async function uploadMaterialAction(formData: FormData): Promise<ActionResult> {
  const { supabase, profile } = await requireAdmin();
  const parsed = materialSchema.safeParse({
    content_item_id: formData.get("content_item_id"),
    material_kind_id: formData.get("material_kind_id"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "اختر ملفاً للرفع." };
  }

  // Effective limit of the Server Action path (see MAX_SERVER_UPLOAD_BYTES).
  if (file.size > MAX_SERVER_UPLOAD_BYTES) {
    return {
      error: `حجم الملف يتجاوز الحد الحالي للرفع (${formatMb(MAX_SERVER_UPLOAD_BYTES)} ميغابايت). قلّل حجم الملف.`,
    };
  }

  let result;
  try {
    result = await uploadMaterialFile({
      client: supabase,
      contentItemId: parsed.data.content_item_id,
      materialKindId: parsed.data.material_kind_id,
      title: parsed.data.title,
      description: parsed.data.description,
      file,
      adminProfileId: profile.id,
    });
  } catch (e) {
    // Never leak internals; details go to the server log only.
    logError("material_upload_unexpected", { message: e instanceof Error ? e.message : String(e) });
    return { error: "حدث خطأ غير متوقع أثناء الرفع. حاول مرة أخرى." };
  }
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin/materials");
  return { success: "تم رفع المادة (مسودة). انشرها لتظهر للطلاب." };
}

export async function updateMaterialAction(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = materialUpdateSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const result = await updateMaterialMetadata({
    client: supabase,
    materialId: parsed.data.id,
    title: parsed.data.title,
    description: parsed.data.description,
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin/materials");
  return { success: "تم تحديث المادة." };
}

export async function attachArticleAction(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const materialId = String(formData.get("material_id") ?? "");
  const json = String(formData.get("json") ?? "");

  const result = await attachArticle({ client: supabase, materialId, jsonText: json });
  if (!result.ok) return { error: result.error ?? "تعذر حفظ المقال." };

  revalidatePath("/admin/materials");
  return { success: "تم حفظ نسخة القراءة بعد التحقق من المخطط." };
}
