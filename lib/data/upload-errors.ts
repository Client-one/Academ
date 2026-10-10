/**
 * Maps low-level database / Storage errors to short, actionable Arabic
 * messages. The raw code/message is logged server-side by the caller; the
 * text returned here never contains SQL, constraint names, paths or keys.
 */

interface ErrLike {
  code?: string;
  message?: string;
  statusCode?: string | number;
  status?: string | number;
}

const text = (e: ErrLike) => (e.message ?? "").toLowerCase();
const status = (e: ErrLike) => String(e.statusCode ?? e.status ?? "");

export function describeDbInsertError(e: ErrLike): string {
  const m = text(e);
  if (e.code === "23505" && m.includes("_order_uq")) {
    return "تعذر تحديد ترتيب المادة بسبب عملية متزامنة. أعد المحاولة.";
  }
  if (e.code === "23503") return "المحور أو نوع المادة لم يعد موجودًا. حدّث الصفحة وحاول مرة أخرى.";
  if (e.code === "42501" || m.includes("row-level security") || m.includes("permission denied")) {
    return "ليس لديك صلاحية إضافة مواد. أعد تسجيل الدخول بحساب مدير.";
  }
  if (e.code === "P0001" && m.includes("requires a")) return "نوع الملف لا يتوافق مع نوع المادة المحدد.";
  if (e.code === "23514") return "بيانات المادة لا تحقق قواعد قاعدة البيانات. تحقق من الحقول وحاول مرة أخرى.";
  return "تعذر حفظ بيانات المادة. لم يُحفظ أي شيء. حاول مرة أخرى.";
}

export function describeStorageError(e: ErrLike): string {
  const m = text(e);
  const s = status(e);
  if (s === "413" || m.includes("exceeded the maximum") || m.includes("too large")) {
    return "حجم الملف أكبر من المسموح به في التخزين.";
  }
  if (s === "404" || m.includes("bucket not found")) {
    return "حاوية التخزين غير جاهزة. راجع إعداد Supabase Storage.";
  }
  if (s === "403" || m.includes("row-level security") || m.includes("unauthorized") || m.includes("permission")) {
    return "ليس لديك صلاحية رفع الملفات. أعد تسجيل الدخول بحساب مدير.";
  }
  if (s === "409" || m.includes("already exists")) return "تعارض في اسم الملف المخزّن. أعد المحاولة.";
  if (m.includes("mime")) return "نوع الملف غير مدعوم في التخزين.";
  return "فشل رفع الملف إلى التخزين. لم يُحفظ أي شيء. حاول مرة أخرى.";
}
