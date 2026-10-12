import { Skeleton } from "@/components/ui/skeleton";

export default function StudentLoading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">جارٍ التحميل…</span>
      <Skeleton className="mb-2 h-7 w-40" />
      <Skeleton className="mb-6 h-4 w-64 max-w-full" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    </div>
  );
}
