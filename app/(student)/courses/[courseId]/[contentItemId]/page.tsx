import { PendingLink } from "@/components/pending-link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { DownloadLink, hasDownloadableFile } from "@/components/download-link";
import { TrackVisit } from "@/components/continue-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { DocIcon, FileIcon } from "@/components/public/icons";
import { listMaterials } from "@/lib/data/academics";
import { requireStudent } from "@/lib/security/guards";
import { MATERIAL_KIND_META } from "@/lib/types";

const FILTERS = [
  { value: "all", label: "الكل" },
  { value: "official", label: "رسمي" },
  { value: "student", label: "ملخصات طلابية" },
] as const;

export default async function ContentItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string; contentItemId: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const { courseId, contentItemId } = await params;
  const { kind } = await searchParams;
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

  const all = (await listMaterials(supabase, contentItemId)).filter((m) => m.status === "published");
  const active = kind === "official" || kind === "student" ? kind : "all";
  const materials =
    active === "all"
      ? all
      : all.filter((m) => (MATERIAL_KIND_META[m.kind_code ?? ""]?.badge ?? "student") === active);
  const title = (item as { title: string }).title;

  return (
    <>
      <TrackVisit href={`/courses/${courseId}/${contentItemId}`} title={title} />
      <PageHeader title={title} subtitle="نزّل المواد التي تحتاجها من القائمة." />

      {all.length > 0 && (
        <nav aria-label="تصفية المواد" className="mb-5 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <PendingLink
              key={f.value}
              href={f.value === "all" ? `/courses/${courseId}/${contentItemId}` : `?kind=${f.value}`}
              aria-current={active === f.value ? "true" : undefined}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                active === f.value
                  ? "border-brand-700 bg-brand-700 text-white"
                  : "border-ink-200 bg-white text-ink-600 hover:border-brand-300 hover:text-brand-800 dark:hover:text-brand-200"
              }`}
            >
              {f.label}
            </PendingLink>
          ))}
        </nav>
      )}

      {materials.length === 0 ? (
        <EmptyState
          title={all.length === 0 ? "لا توجد مواد منشورة في هذا المحور بعد" : "لا توجد مواد من هذا النوع"}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {materials.map((m) => {
            const meta = MATERIAL_KIND_META[m.kind_code ?? ""];
            const isPdf = (m.storage_path ?? "").toLowerCase().endsWith(".pdf");
            const Icon = isPdf ? DocIcon : FileIcon;
            return (
              <div key={m.id} className="flex h-full flex-col rounded-2xl border border-ink-200/70 bg-white p-4 shadow-card">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <Badge tone={meta?.badge === "official" ? "official" : "student"}>
                    {meta?.label ?? "مادة"}
                  </Badge>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:text-brand-300">
                    <Icon className="h-5 w-5" />
                  </span>
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
