/**
 * Stable per-course accent (same course => same colors everywhere).
 * Soft tinted tiles with a darker glyph/text color: calm on the eyes and
 * every pair keeps >= 4.5:1 contrast (text-*-800 on bg-*-100).
 */
const ACCENTS = [
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
  "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200",
  "bg-stone-200 text-stone-800 dark:bg-stone-700/60 dark:text-stone-100",
] as const;

export function courseAccent(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length] ?? ACCENTS[0];
}
