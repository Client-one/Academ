import Link from "next/link";
import { GraduationIcon } from "./icons";

export function Brand({ tone = "dark", className = "" }: { tone?: "dark" | "light"; className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Academ — الصفحة الرئيسية"
      className={`inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 ${className}`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-900/30">
        <GraduationIcon className="h-5 w-5" />
      </span>
      <span
        dir="ltr"
        className={`text-xl font-extrabold tracking-tight ${tone === "dark" ? "text-slate-950" : "text-white"}`}
      >
        Academ
      </span>
    </Link>
  );
}
