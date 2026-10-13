"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowIcon, BookIcon } from "@/components/public/icons";

const KEY = "academ-last-visit";
// Only same-app student content URLs are ever read back from storage.
const SAFE_HREF = /^\/courses\/[0-9a-f-]{36}\/[0-9a-f-]{36}$/i;

interface Visit {
  href: string;
  title: string;
}

/** Records the last content item the student opened (per browser only). */
export function TrackVisit({ href, title }: Visit) {
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ href, title }));
    } catch {
      /* storage unavailable: feature silently disabled */
    }
  }, [href, title]);
  return null;
}

/** "Continue where you left off" — renders nothing if there is no valid record. */
export function ContinueCard() {
  const [visit, setVisit] = useState<Visit | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const v = JSON.parse(raw) as Partial<Visit>;
      if (typeof v.href === "string" && typeof v.title === "string" && SAFE_HREF.test(v.href)) {
        setVisit({ href: v.href, title: v.title.slice(0, 200) });
      }
    } catch {
      /* ignore corrupted value */
    }
  }, []);

  if (!visit) return null;
  return (
    <Link
      href={visit.href}
      className="group mb-8 flex items-center gap-4 rounded-2xl border border-brand-200 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white">
        <BookIcon className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-brand-700 dark:text-brand-300">تابع من حيث توقفت</span>
        <span className="block truncate font-bold text-ink-900">{visit.title}</span>
      </span>
      <ArrowIcon className="h-5 w-5 shrink-0 text-ink-500 transition-transform group-hover:-translate-x-1 motion-reduce:transition-none" />
    </Link>
  );
}
