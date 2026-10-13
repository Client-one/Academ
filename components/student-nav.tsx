import { requireStudent } from "@/lib/security/guards";
import { createClient } from "@/lib/supabase/server";
import { Brand } from "@/components/public/brand";
import { NavLinks } from "./nav-links";
import { LogoutButton } from "./logout-button";
import { ThemeToggle } from "./theme-toggle";

const items = [
  { href: "/dashboard", label: "الرئيسية" },
  { href: "/courses", label: "المقررات" },
];

export async function StudentNav() {
  const { profile } = await requireStudent();
  const supabase = await createClient();
  const [{ data: level }, { data: semester }] = await Promise.all([
    profile.level_id
      ? supabase.from("levels").select("name").eq("id", profile.level_id).maybeSingle()
      : Promise.resolve({ data: null }),
    profile.semester_id
      ? supabase.from("semesters").select("name").eq("id", profile.semester_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <header className="sticky top-0 z-20 border-b border-ink-200/70 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5">
        <div className="flex items-center gap-5">
          <Brand />
          <nav aria-label="التنقل" className="flex items-center gap-1 text-sm font-semibold">
            <NavLinks items={items} />
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-left sm:block">
            <p className="text-sm font-bold text-ink-900">{profile.full_name}</p>
            <p className="text-xs text-ink-500">
              {level?.name ?? ""} — {semester?.name ?? ""}
            </p>
          </div>
          <ThemeToggle className="!h-9 !w-9" />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
