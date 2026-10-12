"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";
import { Select } from "@/components/ui/select";

export interface NavOption {
  id: string;
  label: string;
}

/**
 * Hierarchical academic navigation for admin pages:
 *   Level → Semester → Course → (Content Item)
 *
 * The IDs travel in the URL as plain INPUTS — the server re-validates the
 * whole chain against the database (resolveAdminHierarchy) on every render,
 * so a forged or stale selection simply resolves to "not selected".
 */
export function HierarchyNav({
  levels,
  semesters,
  courses,
  items,
  levelId,
  semesterId,
  courseId,
  itemId,
}: {
  levels: NavOption[];
  semesters: NavOption[];
  courses: NavOption[];
  items?: NavOption[];
  levelId: string | null;
  semesterId: string | null;
  courseId: string | null;
  itemId?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function navigate(next: Record<string, string | null>) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) {
      if (v) params.set(k, v);
    }
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname));
  }

  return (
    <nav
      aria-label="التنقل في الهيكل الأكاديمي"
      className="mb-6 grid gap-3 rounded-2xl border border-ink-100 bg-white p-4 shadow-card sm:grid-cols-2 lg:grid-cols-4"
    >
      <label className="block text-sm font-semibold text-ink-700">
        المستوى
        <Select
          className="mt-1"
          value={levelId ?? ""}
          disabled={pending}
          aria-label="اختر المستوى"
          onChange={(e) =>
            navigate({ level: e.target.value || null, semester: null, course: null, item: null })
          }
        >
          <option value="">— اختر المستوى —</option>
          {levels.map((l) => (
            <option key={l.id} value={l.id}>{l.label}</option>
          ))}
        </Select>
      </label>

      <label className="block text-sm font-semibold text-ink-700">
        الفصل الدراسي
        <Select
          className="mt-1"
          value={semesterId ?? ""}
          disabled={pending || !levelId || semesters.length === 0}
          aria-label="اختر الفصل الدراسي"
          onChange={(e) =>
            navigate({ level: levelId, semester: e.target.value || null, course: null, item: null })
          }
        >
          <option value="">
            {!levelId ? "اختر المستوى أولاً" : semesters.length === 0 ? "لا توجد فصول" : "— اختر الفصل —"}
          </option>
          {semesters.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </Select>
      </label>

      <label className="block text-sm font-semibold text-ink-700">
        المقرر
        <Select
          className="mt-1"
          value={courseId ?? ""}
          disabled={pending || !semesterId || courses.length === 0}
          aria-label="اختر المقرر"
          onChange={(e) =>
            navigate({ level: levelId, semester: semesterId, course: e.target.value || null, item: null })
          }
        >
          <option value="">
            {!semesterId ? "اختر الفصل أولاً" : courses.length === 0 ? "لا توجد مقررات" : "— اختر المقرر —"}
          </option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </Select>
      </label>

      {items && (
        <label className="block text-sm font-semibold text-ink-700">
          محور المحتوى
          <Select
            className="mt-1"
            value={itemId ?? ""}
            disabled={pending || !courseId || items.length === 0}
            aria-label="اختر محور المحتوى"
            onChange={(e) =>
              navigate({ level: levelId, semester: semesterId, course: courseId, item: e.target.value || null })
            }
          >
            <option value="">
              {!courseId ? "اختر المقرر أولاً" : items.length === 0 ? "لا توجد محاور" : "— اختر المحور —"}
            </option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>{i.label}</option>
            ))}
          </Select>
        </label>
      )}

      {/* Reserved row: always occupies its height so showing it never shifts the page. */}
      <p
        className={`col-span-full flex h-5 items-center gap-2 text-sm text-ink-500 ${pending ? "" : "invisible"}`}
        role="status"
        aria-live="polite"
      >
        {pending && (
          <>
            <span
              aria-hidden
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700 motion-reduce:animate-none"
            />
            جارٍ التحميل…
          </>
        )}
      </p>
    </nav>
  );
}
