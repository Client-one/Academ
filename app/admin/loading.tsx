import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">جارٍ التحميل…</span>
      <Skeleton className="mb-2 h-7 w-48" />
      <Skeleton className="mb-6 h-4 w-72 max-w-full" />
      <Skeleton className="mb-4 h-20" />
      <Skeleton className="h-10" />
      <Skeleton className="mt-2 h-10" />
      <Skeleton className="mt-2 h-10" />
      <Skeleton className="mt-2 h-10" />
    </div>
  );
}
