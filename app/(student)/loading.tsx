import { Skeleton } from "@/components/ui/skeleton";

export default function StudentLoading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">جارٍ التحميل…</span>
      <Skeleton className="mb-8 h-40 !rounded-3xl" />
      <Skeleton className="mb-4 h-6 w-48" />
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-ink-200/70 bg-white p-5 shadow-card">
            <Skeleton className="mb-3 h-11 w-11" />
            <Skeleton className="mb-2 h-5 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
