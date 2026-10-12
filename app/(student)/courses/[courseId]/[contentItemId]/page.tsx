import { PendingLink } from "@/components/pending-link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { DownloadLink, hasDownloadableFile } from "@/components/download-link";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { listMaterials } from "@/lib/data/academics";
import { requireStudent } from "@/lib/security/guards";
import { MATERIAL_KIND_META } from "@/lib/types";

export default async function ContentItemPage({
  params,
}: {
  params: Promise<{ courseId: string; contentItemId: string }>;
}) {
  const { courseId, contentItemId } = await params;
  const { supabase } = await requireStudent();

  // URL integrity: the item must exist, be published, AND actually belong to
  // the course in the URL — a mismatched /courses/<A>/<item-of-B> URL is 404.
  const { data: item, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("id", contentItemId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (error) notFound();
  if (
    !item ||
    (item as { status: string }).status !== "published" ||
    (item as { course_id: string }).course_id !== courseId
  ) {
    notFound();
  }

  const materials = (await listMaterials(supabase, contentItemId)).filter(
    (m) => m.status === "published"
  );

  return (
    <>
      <PageHeader title={(item as { title: string }).title} subtitle="نزّل المواد التي تحتاجها من القائمة." />
      {materials.length === 0 ? (
        <EmptyState title="لا توجد مواد منشورة في هذا المحور بعد" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {materials.map((m) => {
            const meta = MATERIAL_KIND_META[m.kind_code ?? ""];
            return (
              <div key={m.id} className="flex h-full flex-col rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
                <div className="mb-2">
                  <Badge tone={meta?.badge === "official" ? "official" : "student"}>
                    {meta?.label ?? "مادة"}
                  </Badge>
                </div>
                <p className="font-bold text-ink-900">{m.title}</p>
                {m.description && <p className="mt-1 text-sm text-ink-500">{m.description}</p>}
                <div className="mt-auto pt-3">
                  {hasDownloadableFile(m) ? (
                    <DownloadLink materialId={m.id} />
                  ) : (
                    <p className="text-sm text-ink-500">لا يوجد ملف للتنزيل حاليًا.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-6 text-sm">
        <PendingLink href={`/courses/${courseId}`} className="font-semibold text-ink-600 hover:underline">
          → العودة إلى المقرر
        </PendingLink>
      </p>
    </>
  );
}
