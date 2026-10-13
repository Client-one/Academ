import Link from "next/link";
import { Brand } from "./brand";
import { ThemeToggle } from "@/components/theme-toggle";

/** Shared centered layout for the public login pages. */
export function AuthShell({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="relative min-h-screen bg-ink-50">
      <div className="absolute end-4 top-4">
        <ThemeToggle />
      </div>
      <main className="mx-auto flex min-h-screen w-full flex-col items-center justify-center px-4 py-12">
        <div className={`w-full ${wide ? "max-w-3xl" : "max-w-md"}`}>
          <div className="mb-8 flex justify-center">
            <Brand />
          </div>
          {children}
          <p className="mt-6 text-center text-sm">
            <Link
              href="/"
              className="rounded font-semibold text-brand-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-brand-300"
            >
              العودة إلى الصفحة الرئيسية
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export function AuthPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-ink-200 bg-white p-6 shadow-card sm:p-8">{children}</div>
  );
}
