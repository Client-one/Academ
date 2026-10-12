import { ActionForm } from "@/components/action-form";
import { MoveButtons } from "@/components/admin-table-actions";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { upsertSemesterAction } from "@/app/admin/actions/academics";
import { listLevels, listSemesters } from "@/lib/data/academics";
import { requireAdmin } from "@/lib/security/guards";

export default async function AdminSemestersPage() {
  const { supabase } = await requireAdmin();
  const [levels, semesters] = await Promise.all([listLevels(supabase), listSemesters(supabase)]);
  return (
    <>
      <PageHeader title="الفصول الدراسية" />
      {levels.length === 0 ? (
        <EmptyState title="لا توجد مستويات بعد" hint="أنشئ مستوى أولاً من صفحة المستويات." />
      ) : (
        <Card className="mb-6">
          <CardTitle className="mb-4">إضافة فصل</CardTitle>
          <ActionForm action={upsertSemesterAction}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="المستوى">
                <Select name="level_id" required>
                  {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </Select>
              </Field>
              <Field label="اسم الفصل"><Input name="name" required /></Field>
            </div>
          </ActionForm>
        </Card>
      )}
      {levels.length > 0 && semesters.length === 0 ? (
        <EmptyState title="لا توجد فصول بعد" />
      ) : (
        <ul className="space-y-2">
          {semesters.map((s) => (
            <li key={s.id} className="rounded-2xl border border-ink-200/70 bg-white p-3 shadow-card">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-ink-900">
                  {s.name} <span className="text-sm font-normal text-ink-500">({s.level_name})</span>
                </span>
                <MoveButtons kind="semester" id={s.id} />
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-semibold text-brand-700">
                  تعديل الفصل
                </summary>
                <ActionForm action={upsertSemesterAction} submitLabel="حفظ التعديل" className="mt-3">
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="level_id" value={s.level_id} />
                  <Field label="اسم الفصل">
                    <Input name="name" defaultValue={s.name} required />
                  </Field>
                </ActionForm>
              </details>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
