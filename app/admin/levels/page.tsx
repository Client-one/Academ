import { ActionForm } from "@/components/action-form";
import { MoveButtons } from "@/components/admin-table-actions";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { upsertLevelAction } from "@/app/admin/actions/academics";
import { listLevels } from "@/lib/data/academics";
import { requireAdmin } from "@/lib/security/guards";

export default async function AdminLevelsPage() {
  const { supabase } = await requireAdmin();
  const levels = await listLevels(supabase);
  return (
    <>
      <PageHeader title="المستويات" />
      <Card className="mb-6">
        <CardTitle className="mb-4">إضافة مستوى</CardTitle>
        <ActionForm action={upsertLevelAction}>
          <Field label="اسم المستوى"><Input name="name" required /></Field>
        </ActionForm>
      </Card>
      {levels.length === 0 ? (
        <EmptyState title="لا توجد مستويات بعد" hint="أضف أول مستوى من النموذج أعلاه." />
      ) : (
        <ul className="space-y-2">
          {levels.map((l) => (
            <li key={l.id} className="rounded-2xl border border-ink-200/70 bg-white p-3 shadow-card">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-ink-900">{l.name}</span>
                <MoveButtons kind="level" id={l.id} />
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-semibold text-brand-700">
                  تعديل المستوى
                </summary>
                <ActionForm action={upsertLevelAction} submitLabel="حفظ التعديل" className="mt-3">
                  <input type="hidden" name="id" value={l.id} />
                  <Field label="اسم المستوى">
                    <Input name="name" defaultValue={l.name} required />
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
