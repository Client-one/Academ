import { DeleteButton } from "@/components/delete-button";
import { deleteEntityAction } from "@/app/admin/actions/deletions";
import { ActionForm } from "@/components/action-form";
import { HierarchyNav } from "@/components/admin/hierarchy-nav";
import { MoveButtons, StatusButtons } from "@/components/admin-table-actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge, statusLabel, statusTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { upsertContentItemAction } from "@/app/admin/actions/academics";
import { resolveAdminHierarchy } from "@/lib/data/academics";
import { requireAdmin } from "@/lib/security/guards";

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; semester?: string; course?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  // URL values are plain inputs; the resolver validates the whole chain in DB.
  const h = await resolveAdminHierarchy(supabase, {
    levelId: sp.level,
    semesterId: sp.semester,
    courseId: sp.course,
  });

  const courseId = h.courseId;

  return (
    <>
      <PageHeader title="محتوى المقررات" subtitle="اختر المستوى ثم الفصل ثم المقرر لإدارة محاوره." />

      <HierarchyNav
        levels={h.levels.map((l) => ({ id: l.id, label: l.name }))}
        semesters={h.semesters.map((s) => ({ id: s.id, label: s.name }))}
        courses={h.courses.map((c) => ({ id: c.id, label: c.name }))}
        levelId={h.levelId}
        semesterId={h.semesterId}
        courseId={courseId}
      />

      {h.levels.length === 0 ? (
        <EmptyState title="لا توجد مستويات بعد" hint="أنشئ المستويات والفصول والمقررات أولاً من صفحات الإدارة." />
      ) : !courseId ? (
        <EmptyState title="اختر مقرراً لعرض محاوره" hint="استخدم القوائم أعلاه للوصول إلى أي مقرر." />
      ) : (
        <>
          <Card className="mb-6">
            <CardTitle className="mb-4">إضافة محور</CardTitle>
            <ActionForm action={upsertContentItemAction}>
              <input type="hidden" name="course_id" value={courseId} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="العنوان"><Input name="title" required /></Field>
                <Field label="الوصف"><Textarea name="description" rows={2} /></Field>
              </div>
            </ActionForm>
          </Card>

          {h.items.length === 0 ? (
            <EmptyState title="لا توجد محاور في هذا المقرر بعد" />
          ) : (
            <ul className="space-y-2">
              {h.items.map((i) => (
                <li key={i.id} className="rounded-2xl border border-ink-200/70 bg-white p-3 shadow-card">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-ink-900">
                      {i.title} <Badge tone={statusTone(i.status)}>{statusLabel(i.status)}</Badge>
                    </span>
                    <span className="flex items-center gap-2">
                      <MoveButtons kind="content_item" id={i.id} />
                      <StatusButtons kind="content_item" id={i.id} status={i.status} />
                      <DeleteButton action={deleteEntityAction.bind(null, "content_item", i.id)} itemName={i.title} warning="يُحذف المحور فقط إذا لم يحتوِ على مواد." />
                    </span>
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-semibold text-brand-700 dark:text-brand-300">
                      تعديل المحور
                    </summary>
                    <ActionForm action={upsertContentItemAction} submitLabel="حفظ التعديل" className="mt-3">
                      <input type="hidden" name="id" value={i.id} />
                      <input type="hidden" name="course_id" value={courseId} />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="العنوان"><Input name="title" defaultValue={i.title} required /></Field>
                        <Field label="الوصف">
                          <Textarea name="description" rows={2} defaultValue={i.description} />
                        </Field>
                      </div>
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
