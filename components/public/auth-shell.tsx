import Link from "next/link";
import { Brand } from "./brand";

/** Shared centered layout for the public login pages. */
export function AuthShell({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900">
      <div aria-hidden className="pointer-events-none absolute -top-40 start-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl" />
      <main className="relative mx-auto flex min-h-screen w-full flex-col items-center justify-center px-4 py-10">
        <div className={`w-full ${wide ? "max-w-3xl" : "max-w-md"}`}>
          <div className="mb-8 flex justify-center">
            <Brand tone="light" />
          </div>
          {children}
          <p className="mt-6 text-center text-sm">
            <Link
              href="/"
              className="rounded text-indigo-200 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
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
    <div className="rounded-3xl border border-white/10 bg-white p-6 shadow-2xl shadow-indigo-950/40 sm:p-8">
      {children}
    </div>
  );
}
