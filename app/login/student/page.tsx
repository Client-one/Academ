import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/forms/login-form";
import { AuthPanel, AuthShell } from "@/components/public/auth-shell";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "تسجيل دخول الطالب | Academ",
  description: "تسجيل دخول الطالب إلى منصة Academ.",
};

export default async function StudentLoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Existing behavior preserved: signed-in users are sent on; the destination
  // pages re-verify the role server-side.
  if (user) redirect("/dashboard");

  return (
    <AuthShell>
      <AuthPanel>
        <h1 className="text-2xl font-extrabold text-ink-950">تسجيل دخول الطالب</h1>
        <p className="mb-6 mt-1 text-sm text-ink-600">ادخل برقم الجامعة وكلمة المرور.</p>
        <LoginForm />
        <p className="mt-5 text-center text-xs text-ink-600">
          حسابك يُنشأ من إدارة الكلية — لا يوجد تسجيل ذاتي.
        </p>
        <p className="mt-3 text-center text-sm">
          <Link href="/login" className="font-semibold text-brand-700 dark:text-brand-300 hover:underline">
            تغيير نوع الحساب
          </Link>
        </p>
      </AuthPanel>
    </AuthShell>
  );
}
