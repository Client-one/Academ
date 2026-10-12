import { Brand } from "@/components/public/brand";
import { NavLinks } from "./nav-links";
import { LogoutButton } from "./logout-button";

const links = [
  { href: "/admin", label: "نظرة عامة" },
  { href: "/admin/students", label: "الطلاب" },
  { href: "/admin/levels", label: "المستويات" },
  { href: "/admin/semesters", label: "الفصول" },
  { href: "/admin/courses", label: "المقررات" },
  { href: "/admin/content", label: "محتوى المقررات" },
  { href: "/admin/materials", label: "المواد" },
];

export function AdminNav({ adminName }: { adminName: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-gradient-to-l from-slate-950 via-brand-950 to-slate-900 text-white">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Brand tone="light" />
            <span className="hidden rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-brand-100 sm:inline">
              لوحة الإدارة
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white">{adminName}</span>
            <LogoutButton onDark />
          </div>
        </div>
        <nav
          aria-label="أقسام الإدارة"
          className="-mx-1 mt-3 flex gap-1 overflow-x-auto rounded-2xl bg-white p-1.5 text-sm font-semibold shadow-lift"
        >
          <NavLinks items={links} exact={["/admin"]} />
        </nav>
      </div>
    </header>
  );
}
