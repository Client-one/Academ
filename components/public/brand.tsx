import Link from "next/link";
import { GraduationIcon } from "./icons";

export function Brand({ className = "" }: { tone?: "dark" | "light"; className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Academ — الصفحة الرئيسية"
      className={`inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${className}`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-white">
        <GraduationIcon className="h-5 w-5" />
      </span>
      <span dir="ltr" className="text-xl font-extrabold tracking-tight text-ink-950">
        Academ
      </span>
    </Link>
  );
}
