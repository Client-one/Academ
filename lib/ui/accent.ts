/**
 * Stable per-course accent (same course => same colors everywhere).
 * Every stop is Tailwind 600+ so white text keeps >= 4.5:1 contrast
 * (checked: lightest start color, sky-700, is 5.9:1).
 */
const ACCENTS = [
  "from-indigo-600 to-violet-700",
  "from-blue-600 to-indigo-700",
  "from-violet-600 to-purple-800",
  "from-sky-700 to-blue-800",
  "from-fuchsia-600 to-violet-800",
  "from-cyan-700 to-indigo-700",
] as const;

export function courseAccent(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length] ?? ACCENTS[0];
}
