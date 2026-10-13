import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/forms/admin-login-form";
import { AuthPanel, AuthShell } from "@/components/public/auth-shell";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "تسجيل دخول المدير | Academ",
  description: "تسجيل دخول المدير إلى لوحة إدارة Academ.",
};

export default async function AdminLoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    // Only forward verified, active admins. Anyone else (e.g. a signed-in
    // student) sees the form instead of bouncing /admin <-> login forever.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle();
    const p = profile as { role: string; is_active: boolean } | null;
    if (p && p.role === "admin" && p.is_active) redirect("/admin");
  }

  return (
    <AuthShell>
      <AuthPanel>
        <h1 className="text-2xl font-extrabold text-ink-950">تسجيل دخول المدير</h1>
        <p className="mb-6 mt-1 text-sm text-ink-600">دخول خاص بالمسؤولين فقط.</p>
        <AdminLoginForm />
        <p className="mt-5 text-center text-sm">
          <Link href="/login" className="font-semibold text-brand-700 dark:text-brand-300 hover:underline">
            تغيير نوع الحساب
          </Link>
        </p>
      </AuthPanel>
    </AuthShell>
  );
}
