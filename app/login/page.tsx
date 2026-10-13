import type { Metadata } from "next";
import Link from "next/link";
import { ArrowIcon, SettingsIcon, UserIcon } from "@/components/public/icons";
import { AuthShell } from "@/components/public/auth-shell";

export const metadata: Metadata = {
  title: "تسجيل الدخول | Academ",
  description: "اختر نوع حسابك للمتابعة إلى منصة Academ.",
};

const roles = [
  {
    href: "/login/student",
    title: "تسجيل دخول الطالب",
    desc: "ادخل إلى حسابك للوصول إلى مقرراتك وموادك الدراسية.",
    cta: "المتابعة كطالب",
    Icon: UserIcon,
    accent: "bg-brand-100 text-brand-800 dark:text-brand-300",
  },
  {
    href: "/login/admin",
    title: "تسجيل دخول المدير",
    desc: "الدخول إلى لوحة الإدارة لإدارة المحتوى والطلاب والصلاحيات.",
    cta: "المتابعة كمدير",
    Icon: SettingsIcon,
    accent: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  },
];

export default function LoginChoicePage() {
  return (
    <AuthShell wide>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-ink-950 sm:text-4xl">مرحبًا بك في Academ</h1>
        <p className="mt-3 text-base text-ink-600">اختر نوع حسابك للمتابعة إلى المنصة.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {roles.map(({ href, title, desc, cta, Icon, accent }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col rounded-3xl border border-ink-200 bg-white p-6 shadow-card transition hover:border-brand-400 hover:shadow-lift focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 motion-reduce:transition-none"
          >
            <span className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${accent}`}>
              <Icon className="h-7 w-7" />
            </span>
            <h2 className="text-xl font-extrabold text-ink-950">{title}</h2>
            <p className="mt-2 flex-1 text-sm leading-7 text-ink-600">{desc}</p>
            <span className="mt-6 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 text-sm font-bold text-white transition-colors group-hover:bg-brand-800">
              {cta}
              <ArrowIcon className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </div>
    </AuthShell>
  );
}
