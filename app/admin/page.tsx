import Link from "next/link";
import { Badge, statusLabel, statusTone } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdmin } from "@/lib/security/guards";

export default async function AdminOverviewPage() {
  const { supabase } = await requireAdmin();
  const tables = ["profiles", "levels", "semesters", "courses", "content_items", "content_materials"];
  const counts = await Promise.all(
    tables.map(async (t) => {
      const { count } = await supabase.from(t).select("*", { count: "exact", head: true });
      return count ?? 0;
    })
  );
  const { data: latest } = await supabase
    .from("content_materials")
    .select("id, title, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5);
  const latestMaterials = (latest ?? []) as { id: string; title: string; status: string; created_at: string }[];
  const cards = [
    { label: "الطلاب", value: counts[0] },
    { label: "المستويات", value: counts[1] },
    { label: "الفصول", value: counts[2] },
    { label: "المقررات", value: counts[3] },
    { label: "محاور المحتوى", value: counts[4] },
    { label: "المواد", value: counts[5] },
  ];
  return (
    <>
      <PageHeader title="نظرة عامة" subtitle="حالة المنصة الحالية." />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <Card key={c.label} className="border-t-4 border-t-brand-500 text-center">
            <p className="bg-gradient-to-br from-brand-600 to-violet-600 bg-clip-text text-3xl font-extrabold text-transparent">{c.value}</p>
            <CardTitle className="mt-1 text-sm">{c.label}</CardTitle>
          </Card>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/admin/students" className="inline-flex min-h-[44px] items-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 px-5 text-sm font-bold text-white shadow-sm hover:from-brand-700 hover:to-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
          إضافة طالب
        </Link>
        <Link href="/admin/materials" className="inline-flex min-h-[44px] items-center rounded-xl border border-ink-300 bg-white px-5 text-sm font-bold text-ink-800 hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
          رفع مادة
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-extrabold text-ink-950">آخر المواد المضافة</h2>
        {latestMaterials.length === 0 ? (
          <p className="text-sm text-ink-500">لا توجد مواد بعد.</p>
        ) : (
          <ul className="space-y-2">
            {latestMaterials.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-ink-200/70 bg-white p-3 shadow-card">
                <span className="font-semibold text-ink-900">{m.title}</span>
                <span className="flex items-center gap-3 text-xs text-ink-500">
                  <Badge tone={statusTone(m.status)}>{statusLabel(m.status)}</Badge>
                  {new Date(m.created_at).toLocaleDateString("ar-EG")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
