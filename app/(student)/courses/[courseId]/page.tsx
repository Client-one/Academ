import { PendingLink } from "@/components/pending-link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { listContentItems } from "@/lib/data/academics";
import { courseAccent } from "@/lib/ui/accent";
import { requireStudent } from "@/lib/security/guards";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const { supabase, profile } = await requireStudent();

  // Authorization is enforced by RLS; .maybeSingle() returns null for
  // cross-semester/draft/archived IDs — treated identically as not found.
  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .maybeSingle();
  if (!course) notFound();

  const items = await listContentItems(supabase, courseId);
  const published = items.filter((i) => i.status === "published");

  return (
    <>
      <section className={`relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br ${courseAccent(courseId)} p-6 text-white shadow-lift sm:p-8`}>
        <div aria-hidden className="pointer-events-none absolute -bottom-16 end-4 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <p className="relative text-sm font-semibold text-white/95" dir="ltr">
          {(course as { code: string }).code}
        </p>
        <h1 className="relative mt-1 text-2xl font-extrabold sm:text-3xl">{(course as { name: string }).name}</h1>
        <p className="relative mt-2 text-sm text-white/95">{published.length} محور منشور</p>
      </section>
      {published.length === 0 ? (
        <EmptyState title="لم تُنشر محاور بعد" hint="ستُضاف محاور المقرر هنا فور اعتمادها." />
      ) : (
        <ol className="space-y-2">
          {published.map((item, idx) => (
            <li key={item.id}>
              <PendingLink
                href={`/courses/${courseId}/${item.id}`}
                indicator="corner"
                className="flex items-center gap-3 rounded-2xl border border-ink-200/70 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-sm font-extrabold text-white">
                  {idx + 1}
                </span>
                <span className="min-w-0">
                  <span className="block font-bold text-ink-900">{item.title}</span>
                  {item.description && (
                    <span className="block truncate text-sm text-ink-500">{item.description}</span>
                  )}
                </span>
                <Badge tone="neutral">مُنشَر</Badge>
              </PendingLink>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
