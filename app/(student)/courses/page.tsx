import { PendingLink } from "@/components/pending-link";
import { BookIcon } from "@/components/public/icons";
import { courseAccent } from "@/lib/ui/accent";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { listCoursesForSemester } from "@/lib/data/academics";
import { requireStudent } from "@/lib/security/guards";

export default async function CoursesPage() {
  const { supabase, profile } = await requireStudent();
  const courses = await listCoursesForSemester(supabase, profile.semester_id!);

  return (
    <>
      <PageHeader title="المقررات" subtitle="مقررات فصلك الدراسي الحالي فقط." />
      {courses.length === 0 ? (
        <EmptyState title="لا توجد مقررات منشورة بعد" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {courses.map((course) => (
            <PendingLink key={course.id} href={`/courses/${course.id}`} indicator="corner">
              <Card className="h-full transition hover:border-brand-400 hover:shadow-lift motion-reduce:transition-none">
                <span className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${courseAccent(course.id)}`}>
                  <BookIcon className="h-5 w-5" />
                </span>
                <CardTitle className="text-lg">{course.name}</CardTitle>
                <p className="mt-1 text-sm text-ink-500" dir="ltr">{course.code}</p>
              </Card>
            </PendingLink>
          ))}
        </div>
      )}
    </>
  );
}
