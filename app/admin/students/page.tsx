import { DeleteButton } from "@/components/delete-button";
import { deleteStudentAction } from "@/app/admin/actions/deletions";
import { ActionForm } from "@/components/action-form";
import { ConfirmButton } from "@/components/confirm-button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  createStudentAction,
  updateStudentAction,
  resetStudentPasswordAction,
  toggleStudentStatus,
} from "@/app/admin/actions/students";
import { listSemesters } from "@/lib/data/academics";
import { listStudents } from "@/lib/data/students";
import { requireAdmin } from "@/lib/security/guards";

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; edit?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(0, Number(sp.page ?? 0) || 0);
  let students: Awaited<ReturnType<typeof listStudents>>["students"] = [];
  let count = 0;
  let loadError: string | null = null;
  try {
    ({ students, count } = await listStudents(supabase, { page, search: sp.q }));
  } catch (e) {
    // listStudents already logged the details; show a safe message only.
    loadError = e instanceof Error ? e.message : "تعذر تحميل قائمة الطلاب.";
  }
  const semesters = await listSemesters(supabase);
  const editing = students.find((s) => s.id === sp.edit);

  return (
    <>
      <PageHeader title="إدارة الطلاب" subtitle={`الإجمالي: ${count} طالب`} />

      <Card className="mb-6">
        <CardTitle className="mb-4">{editing ? "تعديل طالب" : "إنشاء طالب جديد"}</CardTitle>
        <ActionForm action={editing ? updateStudentAction : createStudentAction}>
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="الاسم الكامل"><Input name="full_name" required defaultValue={editing?.full_name} /></Field>
            <Field label="رقم الجامعة">
              <Input name="university_id" required defaultValue={editing?.university_id ?? ""} dir="ltr" className="text-right" />
            </Field>
            {!editing && (
              <Field label="كلمة المرور الابتدائية"><Input name="password" required minLength={8} /></Field>
            )}
            <Field label="المستوى / الفصل">
              <Select name="semester_id" defaultValue={editing?.semester_id ?? undefined} required>
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>{s.level_name} — {s.name}</option>
                ))}
              </Select>
            </Field>
          </div>
        </ActionForm>
      </Card>

      <form method="GET" className="mb-4 flex gap-2">
        <Input name="q" defaultValue={sp.q ?? ""} placeholder="بحث بالاسم أو رقم الجامعة…" />
        <Button type="submit" variant="secondary">بحث</Button>
      </form>

      {loadError ? (
        <Alert kind="error">{loadError} حاول مرة أخرى، وإن استمرت المشكلة راجع سجلات الخادم.</Alert>
      ) : students.length === 0 ? (
        <EmptyState title="لا يوجد طلاب" />
      ) : (
        <div className="md:overflow-x-auto md:rounded-2xl md:border md:border-ink-200/70 md:bg-white md:shadow-card">
          <table className="w-full text-sm md:min-w-[760px]">
            <thead className="hidden md:table-header-group">
              <tr className="border-b border-ink-100 text-right text-ink-500">
                <th className="p-3 font-semibold">الاسم</th>
                <th className="p-3 font-semibold">رقم الجامعة</th>
                <th className="p-3 font-semibold">الفصل</th>
                <th className="p-3 font-semibold">الحالة</th>
                <th className="p-3 font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody className="block md:table-row-group">
              {students.map((s) => (
                <tr key={s.id} className="mb-3 block rounded-2xl border border-ink-200/70 bg-white p-4 align-top shadow-card md:mb-0 md:table-row md:rounded-none md:border-0 md:border-b md:border-ink-100 md:bg-transparent md:p-0 md:shadow-none">
                  <td className="block py-1 font-semibold text-ink-900 md:table-cell md:p-3">{s.full_name}</td>
                  <td className="block py-1 text-right md:table-cell md:p-3" dir="ltr" data-label="رقم الجامعة">{s.university_id}</td>
                  <td className="block py-1 text-ink-600 md:table-cell md:p-3">{s.level_name} — {s.semester_name}</td>
                  <td className="block py-1 md:table-cell md:p-3"><Badge tone={s.is_active ? "published" : "archived"}>{s.is_active ? "نشط" : "معطّل"}</Badge></td>
                  <td className="block pt-3 md:table-cell md:p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <a href={`?edit=${s.id}`}><Button size="sm" variant="ghost">تعديل</Button></a>
                      <ConfirmButton
                        action={toggleStudentStatus.bind(null, s.id, !s.is_active)}
                        confirmMessage={s.is_active ? "تعطيل الطالب وإنهاء جلساته فوراً؟" : "تفعيل الطالب؟"}
                        label={s.is_active ? "تعطيل" : "تفعيل"}
                        variant={s.is_active ? "danger" : "secondary"}
                      />
                      <DeleteButton
                        action={deleteStudentAction.bind(null, s.id)}
                        itemName={s.full_name}
                        warning="سيُحذف حساب الطالب نهائيًا وتنتهي جلساته فورًا. إن كنت تريد إيقافه مؤقتًا فاستخدم «تعطيل» بدلًا من الحذف."
                      />
                      <ActionForm
                        action={resetStudentPasswordAction}
                        submitLabel="تعيين"
                        className="flex items-end gap-2 !space-y-0"
                      >
                        <input type="hidden" name="id" value={s.id} />
                        <Input name="password" required minLength={8} placeholder="كلمة مرور جديدة" className="w-40" />
                      </ActionForm>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
