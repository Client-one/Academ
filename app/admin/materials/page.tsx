import { ActionForm } from "@/components/action-form";
import { HierarchyNav } from "@/components/admin/hierarchy-nav";
import { MoveButtons, StatusButtons } from "@/components/admin-table-actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge, statusLabel, statusTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  uploadMaterialAction,
  updateMaterialAction,
  attachArticleAction,
} from "@/app/admin/actions/materials";
import { listMaterialKinds, listMaterials, resolveAdminHierarchy } from "@/lib/data/academics";
import { requireAdmin } from "@/lib/security/guards";

export default async function AdminMaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; semester?: string; course?: string; item?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const [h, kinds] = await Promise.all([
    resolveAdminHierarchy(supabase, {
      levelId: sp.level,
      semesterId: sp.semester,
      courseId: sp.course,
      itemId: sp.item,
    }),
    listMaterialKinds(supabase),
  ]);

  const itemId = h.itemId;
  const materials = itemId ? await listMaterials(supabase, itemId) : [];

  return (
    <>
      <PageHeader
        title="المواد"
        subtitle="اختر المستوى ← الفصل ← المقرر ← المحور، ثم ارفع ملفاً وانشره."
      />

      <HierarchyNav
        levels={h.levels.map((l) => ({ id: l.id, label: l.name }))}
        semesters={h.semesters.map((s) => ({ id: s.id, label: s.name }))}
        courses={h.courses.map((c) => ({ id: c.id, label: c.name }))}
        items={h.items.map((i) => ({ id: i.id, label: i.title }))}
        levelId={h.levelId}
        semesterId={h.semesterId}
        courseId={h.courseId}
        itemId={itemId}
      />

      {h.levels.length === 0 ? (
        <EmptyState title="لا توجد مستويات بعد" hint="أنشئ الهيكل الأكاديمي أولاً من صفحات الإدارة." />
      ) : !itemId ? (
        <EmptyState title="اختر محور محتوى لعرض مواده" hint="استخدم القوائم أعلاه للوصول إلى أي محور." />
      ) : (
        <>
          <Card className="mb-6">
            <CardTitle className="mb-4">رفع مادة جديدة</CardTitle>
            <ActionForm action={uploadMaterialAction} submitLabel="رفع الملف">
              <input type="hidden" name="content_item_id" value={itemId} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="نوع المادة">
                  <Select name="material_kind_id" required>
                    {kinds.map((k) => (
                      <option key={k.id} value={k.id}>{k.name}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="العنوان"><Input name="title" required /></Field>
                <Field label="الوصف"><Textarea name="description" rows={2} /></Field>
                <Field label="الملف (PDF/JPG/PNG/WEBP — حد أقصى 20MB)">
                  <Input name="file" type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp" />
                </Field>
              </div>
              <p className="text-xs text-ink-500">
                يتم التحقق من محتوى الملف الفعلي وتوافقه مع نوع المادة قبل الحفظ؛ وتُرفع الملفات
                بأسماء داخلية آمنة ولا تُنشر للطلاب إلا بعد اكتمال الرفع ثم النشر اليدوي.
              </p>
            </ActionForm>
          </Card>

          {materials.length === 0 ? (
            <EmptyState title="لا توجد مواد في هذا المحور بعد" />
          ) : (
            <ul className="space-y-3">
              {materials.map((m) => (
                <li key={m.id} className="rounded-xl border border-ink-100 bg-white p-4 shadow-card">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-ink-900">
                      {m.title}{" "}
                      <Badge tone={statusTone(m.status)}>{statusLabel(m.status)}</Badge>
                      {m.upload_status === "pending" ? <Badge tone="draft">رفع غير مكتمل</Badge> : null}
                      {m.article != null ? <Badge tone="published">نسخة قراءة</Badge> : null}
                    </span>
                    <span className="flex items-center gap-2">
                      <MoveButtons kind="material" id={m.id} />
                      <StatusButtons kind="material" id={m.id} status={m.status} />
                    </span>
                  </div>

                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-semibold text-brand-700">
                      تعديل المادة
                    </summary>
                    <ActionForm action={updateMaterialAction} submitLabel="حفظ التعديل" className="mt-3">
                      <input type="hidden" name="id" value={m.id} />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="العنوان">
                          <Input name="title" defaultValue={m.title} required />
                        </Field>
                        <Field label="الوصف">
                          <Textarea name="description" rows={2} defaultValue={m.description} />
                        </Field>
                      </div>
                    </ActionForm>
                  </details>

                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-semibold text-brand-700">
                      إرفاق نسخة قراءة (مقال JSON)
                    </summary>
                    <ActionForm action={attachArticleAction} submitLabel="التحقق والحفظ" className="mt-3">
                      <input type="hidden" name="material_id" value={m.id} />
                      <Field label="JSON المقال (schemaVersion: 1)">
                        <Textarea name="json" rows={8} dir="ltr" className="font-mono text-xs" required />
                      </Field>
                    </ActionForm>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
