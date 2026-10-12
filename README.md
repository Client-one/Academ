# المنصة الأكاديمية — Academic Platform V1

منصة موارد أكاديمية خاصة وآمنة لطلبة تقنية المعلومات.
Next.js 15 (App Router) · TypeScript strict · Supabase (PostgreSQL + Auth + Storage) · Tailwind CSS · Zod · Vitest

## المزايا

- دخول الطالب برقم الجامعة + كلمة المرور (لا يوجد تسجيل ذاتي).
- دخول منفصل للمدير عبر `/login/admin`.
- كل طالب يرى مستواه وفصله فقط — الحماية بـ RLS على مستوى قاعدة البيانات.
- مقررات ← محاور ← مواد (ملفات PDF/صور رسمية وملخصات طلابية بتمييز واضح).
- قارئ مقالات داخل الموقع من JSON مُتحقق منه (الملف الأصلي يبقى متاحاً).
- بحث مفهرس بصلاحيات، مع تطبيع عربي محافظ.
- تخزين خاص مع روابط موقعة قصيرة العمر (120 ثانية) والتحقق من البايتات السحرية للملفات.
- واجهة عربية RTL، متجاوبة، خفيفة على الجوال والإنترنت الضعيف.

## التشغيل المحلي

```bash
npm install
cp .env.example .env.local   # ثم املأ القيم من لوحة Supabase
# نفّذ migrations بالترتيب (0001 ← 0004) ثم supabase/seed.sql في SQL Editor
npm run dev
```

## أوامر الجودة

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## إنشاء أول مدير (يدوي — مرة واحدة)

1. Supabase Dashboard → Authentication → Add user (بريد + كلمة مرور قوية).
2. في SQL Editor:

```sql
insert into public.profiles (id, full_name, role)
values ('<AUTH_USER_UUID>', 'المدير العام', 'admin');
```

3. ادخل عبر `/login/admin`.

## مخطط المقال (للتحويل الخارجي من PDF)

```json
{
  "schemaVersion": 1,
  "title": "عنوان الملخص",
  "blocks": [
    { "type": "heading", "level": 2, "text": "…" },
    { "type": "paragraph", "text": "…" },
    { "type": "list", "ordered": false, "items": ["…"] },
    { "type": "definition", "term": "…", "definition": "…" },
    { "type": "note", "tone": "info", "text": "…" },
    { "type": "example", "title": "…", "text": "…" }
  ]
}
```

ارفع JSON من `/admin/materials` (زر "إرفاق نسخة قراءة") بعد رفع الملف الأصلي.

## ملاحظات أمنية

- لا تُخزَّن أسرار في الكود إطلاقاً؛ `.env*` مستثناة في `.gitignore`، و`.env.example`
  يحتوي أسماء المتغيرات فقط. إذا تسرّبت أي مفاتيح سابقاً، دوّرها من لوحة Supabase فوراً.
- رفع المواد ذو مرحلتين مع تراجع كامل: سجل `pending` (بلا مسار تخزين) ← رفع الملف ←
  `ready` مع مسار UUID. أي فشل يحذف الطرف الآخر، والمادة غير المكتملة لا تُنشر ولا تظهر للطلاب.
- نوع الملف يُتحقق منه بالبايتات السحرية ويُقابَل بنوع المادة (PDF للأنواع الرسمية/الملخصات،
  صور لـ student_summary_image) — في التطبيق وقاعدة البيانات معاً.
- هذه الإجراءات على مستوى الكود والمخطط؛ التحقق النهائي من RLS/Storage/Auth يتطلب
  تشغيلها في بيئة Supabase الخاصة بالمشروع (انظر docs/DEPLOYMENT.md).

## الوثائق

- `docs/DEPLOYMENT.md` — خطوات النشر على Vercel + Supabase بالتفصيل.
- `docs/SECURITY.md` — نموذج التهديد، قرارات الأمان، وحدود V1.
- `docs/VALIDATION-REPORT.md` — ما تم التحقق منه وما يبقى يدوياً.
