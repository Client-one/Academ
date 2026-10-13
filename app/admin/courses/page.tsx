import { DeleteButton } from "@/components/delete-button";
import { deleteEntityAction } from "@/app/admin/actions/deletions";
import { ActionForm } from "@/components/action-form";
import { MoveButtons, StatusButtons } from "@/components/admin-table-actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge, statusLabel, statusTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { upsertCourseAction } from "@/app/admin/actions/academics";
import { listCoursesForSemester, listSemesters } from "@/lib/data/academics";
import { requireAdmin } from "@/lib/security/guards";

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ semester?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const semesters = await listSemesters(supabase);
  // The URL value is only an input: it must match a real semester, else
  // nothing is selected (no silent fallback to an arbitrary first row).
  const semesterId = semesters.some((s) => s.id === sp.semester) ? sp.semester! : "";
  const courses = semesterId ? await listCoursesForSemester(supabase, semesterId) : [];

  return (
    <>
      <PageHeader title="المقررات" subtitle="اختر الفصل الدراسي لإدارة مقرراته." />

      {semesters.length === 0 ? (
        <EmptyState title="لا توجد فصول دراسية بعد" hint="أنشئ المستويات والفصول أولاً." />
      ) : (
        <form method="GET" className="mb-4 flex max-w-xs items-center gap-2">
          <Select name="semester" defaultValue={semesterId} aria-label="اختر الفصل الدراسي">
            <option value="">— اختر الفصل —</option>
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>{s.level_name} — {s.name}</option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">عرض</Button>
        </form>
      )}

      {semesters.length > 0 && !semesterId && (
        <EmptyState title="اختر فصلاً دراسياً لعرض مقرراته" />
      )}

      {semesterId && (
        <Card className="mb-6">
          <CardTitle className="mb-4">إضافة مقرر</CardTitle>
          <ActionForm action={upsertCourseAction}>
            <input type="hidden" name="semester_id" value={semesterId} />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="اسم المقرر"><Input name="name" required /></Field>
              <Field label="الرمز"><Input name="code" required dir="ltr" className="text-right" /></Field>
              <Field label="الوصف"><Textarea name="description" rows={2} /></Field>
            </div>
          </ActionForm>
        </Card>
      )}

      {semesterId && courses.length === 0 ? (
        <EmptyState title="لا توجد مقررات في هذا الفصل بعد" />
      ) : (
        <ul className="space-y-2">
          {courses.map((c) => (
            <li key={c.id} className="rounded-2xl border border-ink-200/70 bg-white p-3 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-ink-900">
                  {c.name}{" "}
                  <span className="text-sm font-normal text-ink-500" dir="ltr">{c.code}</span>{" "}
                  <Badge tone={statusTone(c.status)}>{statusLabel(c.status)}</Badge>
                </span>
                <span className="flex items-center gap-2">
                  <MoveButtons kind="course" id={c.id} />
                  <StatusButtons kind="course" id={c.id} status={c.status} />
                  <DeleteButton action={deleteEntityAction.bind(null, "course", c.id)} itemName={c.name} warning="يُحذف المقرر فقط إذا لم يحتوِ على محاور." />
                </span>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-semibold text-brand-700 dark:text-brand-300">
                  تعديل المقرر
                </summary>
                <ActionForm action={upsertCourseAction} submitLabel="حفظ التعديل" className="mt-3">
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="semester_id" value={c.semester_id} />
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="اسم المقرر">
                      <Input name="name" defaultValue={c.name} required />
                    </Field>
                    <Field label="الرمز">
                      <Input name="code" defaultValue={c.code} required dir="ltr" className="text-right" />
                    </Field>
                    <Field label="الوصف">
                      <Textarea name="description" rows={2} defaultValue={c.description} />
                    </Field>
                  </div>
                </ActionForm>
              </details>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
