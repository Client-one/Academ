import { PendingLink } from "@/components/pending-link";
import { redirect } from "next/navigation";
import { BookIcon } from "@/components/public/icons";
import { ContinueCard } from "@/components/continue-card";
import { Highlight } from "@/components/highlight";
import { courseAccent } from "@/lib/ui/accent";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DownloadLink, hasDownloadableFile } from "@/components/download-link";
import { listCoursesForSemester } from "@/lib/data/academics";
import { searchStudentContent } from "@/lib/data/search";
import { requireStudent } from "@/lib/security/guards";
import { searchQuerySchema } from "@/lib/validation/schemas";
import { MATERIAL_KIND_META } from "@/lib/types";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { supabase, profile } = await requireStudent();
  const { q } = await searchParams;
  const semesterId = profile.semester_id!;

  const courses = await listCoursesForSemester(supabase, semesterId);

  const search = searchQuerySchema.safeParse(q ?? "");
  const results = search.success ? await searchStudentContent(supabase, search.data) : null;
  const hasQuery = typeof q === "string" && q.trim().length > 0;

  const totalResults = results
    ? results.courses.length + results.contentItems.length + results.materials.length
    : 0;

  return (
    <>
      <section className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-brand-950 to-brand-800 p-6 text-white shadow-lift sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -bottom-24 end-0 h-64 w-64 rounded-full bg-violet-500/25 blur-3xl" />
        <div className="relative">
          <p className="text-sm font-semibold text-brand-200">لوحة الطالب</p>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">أهلاً، {profile.full_name}</h1>
          <p className="mt-2 max-w-xl text-sm leading-7 text-brand-100">
            تصفح مقررات فصلك الدراسي وابحث في المواد المعتمدة.
          </p>
          <form action="/dashboard" method="GET" className="mt-6 flex flex-col gap-2 sm:flex-row" role="search">
            <Input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="ابحث في المقررات والعناوين والمواد…"
              aria-label="بحث"
              className="!border-white/20 !py-3 sm:flex-1"
            />
            <Button type="submit" size="lg" className="!from-white !to-brand-50 !text-brand-900 hover:!from-brand-50 hover:!to-brand-100">
              بحث
            </Button>
          </form>
        </div>
      </section>

      {!hasQuery && <ContinueCard />}

      {hasQuery && (
        <section className="mb-8">
          {search.success === false && (
            <p className="text-sm font-medium text-red-700">{search.error.issues[0]?.message}</p>
          )}
          {results && totalResults === 0 && (
            <EmptyState title="لا توجد نتائج مطابقة" hint="جرّب كلمات مختلفة أو تحقق من الإملاء." />
          )}
          {results && totalResults > 0 && (
            <div className="space-y-2">
              {results.courses.map((c) => (
                <PendingLink indicator="corner" key={c.id} href={`/courses/${c.id}`}
                  className="block rounded-xl border border-ink-100 bg-white p-3 shadow-card hover:border-brand-300 hover:shadow-lift">
                  <span className="font-bold text-ink-900"><Highlight text={c.name} query={q} /></span>
                  <span className="mr-2 text-xs text-ink-500" dir="ltr">{c.code}</span>
                </PendingLink>
              ))}
              {results.contentItems.map((i) => (
                <PendingLink indicator="corner" key={i.id} href={`/courses/${i.course_id}/${i.id}`}
                  className="block rounded-xl border border-ink-100 bg-white p-3 shadow-card hover:border-brand-300">
                  <span className="font-bold text-ink-900"><Highlight text={i.title} query={q} /></span>
                  <span className="mr-2 text-xs text-ink-500">عنوان محتوى</span>
                </PendingLink>
              ))}
              {results.materials.map((m) => (
                <div key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-100 bg-white p-3 shadow-card">
                  <span>
                    <span className="font-bold text-ink-900"><Highlight text={m.title} query={q} /></span>
                    <span className="mr-2 text-xs text-ink-500">
                      {MATERIAL_KIND_META[m.kind_code ?? ""]?.label ?? "مادة"}
                    </span>
                  </span>
                  {hasDownloadableFile(m) ? (
                    <DownloadLink materialId={m.id} />
                  ) : (
                    <span className="text-xs text-ink-500">لا يوجد ملف للتنزيل</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-4 text-xl font-extrabold text-ink-950">مقررات الفصل الحالي</h2>
        {courses.length === 0 ? (
          <EmptyState title="لا توجد مقررات منشورة بعد" hint="ستظهر مقررات فصلك هنا فور اعتمادها من الإدارة." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {courses.map((course) => (
              <PendingLink indicator="corner" key={course.id} href={`/courses/${course.id}`}>
                <Card className="group h-full transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                  <span className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${courseAccent(course.id)} text-white`}>
                    <BookIcon className="h-5 w-5" />
                  </span>
                  <CardTitle className="text-lg">{course.name}</CardTitle>
                  <p className="mt-1 text-sm text-ink-500" dir="ltr">{course.code}</p>
                  {course.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-ink-600">{course.description}</p>
                  )}
                </Card>
              </PendingLink>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
