import { Brand } from "@/components/public/brand";
import { NavLinks } from "./nav-links";
import { LogoutButton } from "./logout-button";
import { ThemeToggle } from "./theme-toggle";

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
    <header className="sticky top-0 z-20 border-b border-ink-200 bg-white/90 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Brand />
            <span className="hidden rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-800 dark:text-brand-300 sm:inline">
              لوحة الإدارة
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-bold text-ink-800">{adminName}</span>
            <ThemeToggle className="!h-9 !w-9" />
            <LogoutButton />
          </div>
        </div>
        <nav aria-label="أقسام الإدارة" className="-mx-1 mt-3 flex gap-1 overflow-x-auto text-sm font-semibold">
          <NavLinks items={links} exact={["/admin"]} />
        </nav>
      </div>
    </header>
  );
}
