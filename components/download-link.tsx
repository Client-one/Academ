/**
 * Student download action. A plain <a> (not next/link) on purpose: Link would
 * prefetch the route handler and mint signed URLs nobody clicked.
 */
export function DownloadLink({ materialId, className = "" }: { materialId: string; className?: string }) {
  return (
    <a
      href={`/download/${materialId}`}
      rel="nofollow"
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${className}`}
    >
      <span aria-hidden>⬇</span> تنزيل الملف
    </a>
  );
}

export function hasDownloadableFile(m: { upload_status: string; storage_path: string | null }): boolean {
  return m.upload_status === "ready" && !!m.storage_path;
}
