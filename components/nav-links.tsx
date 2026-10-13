"use client";

import { usePathname } from "next/navigation";
import { PendingLink } from "./pending-link";

export interface NavItem {
  href: string;
  label: string;
}

/** Nav pills with the current section highlighted (presentation only). */
export function NavLinks({ items, exact = [] }: { items: NavItem[]; exact?: string[] }) {
  const pathname = usePathname();
  return (
    <>
      {items.map((l) => {
        const active = exact.includes(l.href)
          ? pathname === l.href
          : pathname === l.href || pathname.startsWith(l.href + "/");
        return (
          <PendingLink
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-xl px-3.5 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              active ? "bg-brand-700 text-white shadow-sm" : "text-ink-600 hover:bg-brand-50 hover:text-brand-800 dark:hover:text-brand-200"
            }`}
          >
            {l.label}
          </PendingLink>
        );
      })}
    </>
  );
}
