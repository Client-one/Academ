/** Neutral placeholder block used by loading.tsx files. */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-xl bg-ink-200/70 motion-reduce:animate-none ${className}`}
    />
  );
}
