import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/public/brand";
import { LandingHeader } from "@/components/public/landing-header";
import {
  ArrowIcon,
  BookIcon,
  DocIcon,
  FileIcon,
  LayersIcon,
  SearchIcon,
  ShieldIcon,
} from "@/components/public/icons";

export const metadata: Metadata = {
  title: "Academ | رحلتك الأكاديمية تبدأ من هنا",
  description:
    "منصة أكاديمية عربية تجمع موادك التعليمية وملخصاتك الأكاديمية في تجربة واحدة بسيطة ومنظمة.",
};

const features = [
  { Icon: BookIcon, title: "المواد الدراسية", desc: "الوصول إلى المقررات والمواد وفق الهيكل الأكاديمي المتاح." },
  { Icon: DocIcon, title: "المقالات والملخصات", desc: "قراءة المحتوى الأكاديمي المنشور داخل المنصة." },
  { Icon: FileIcon, title: "ملفات تعليمية", desc: "الوصول إلى الملفات التعليمية المسموح بها بحسب صلاحيات المستخدم." },
  { Icon: SearchIcon, title: "بحث منظم", desc: "البحث عن المواد والمحتوى الأكاديمي المتاح لحسابك." },
  { Icon: LayersIcon, title: "تنظيم أكاديمي", desc: "تنظيم المحتوى بحسب المستويات والفصول والمقررات المدعومة حاليًا." },
  { Icon: ShieldIcon, title: "وصول آمن", desc: "المحتوى المحمي متاح للمستخدمين المصرح لهم فقط." },
];

const resources = [
  { Icon: BookIcon, title: "المواد الدراسية", desc: "مقررات مرتبة في محاور ومواد بحسب مستواك وفصلك." },
  { Icon: DocIcon, title: "المقالات والملخصات", desc: "ملخصات ومقالات تُقرأ مباشرة داخل المنصة." },
  { Icon: FileIcon, title: "ملفات PDF والملفات التعليمية", desc: "ملفات رسمية وصور يمكن تنزيلها وفق صلاحياتك." },
];

const steps = [
  { n: "١", title: "سجّل الدخول", desc: "اختر نوع حسابك للوصول إلى المنصة.", href: "/login" },
  { n: "٢", title: "اكتشف محتواك الأكاديمي", desc: "تصفح المواد والمقررات المتاحة لحسابك." },
  { n: "٣", title: "ابدأ رحلتك التعليمية", desc: "اقرأ المحتوى ونزّل الملفات المسموح بها وفق صلاحياتك." },
];

const focus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2";

export default function LandingPage() {
  return (
    <div className="bg-white text-slate-900">
      <LandingHeader />
      <main>
        {/* Hero */}
        <section id="home" className="relative scroll-mt-20 overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
          <div aria-hidden className="pointer-events-none absolute -bottom-32 end-0 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 md:py-24 lg:grid-cols-2">
            <div>
              <h1 className="text-balance text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl lg:leading-[1.15]">
                رحلتك الأكاديمية تبدأ من هنا
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-indigo-100">
                كل ما تحتاجه لتنظيم دراستك والوصول إلى موادك التعليمية وملخصاتك الأكاديمية، في تجربة واحدة بسيطة ومنظمة.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/login"
                  className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-white px-7 text-base font-bold text-indigo-900 shadow-lg transition-colors hover:bg-indigo-50 ${focus} focus-visible:ring-offset-slate-950`}
                >
                  ابدأ الآن
                  <ArrowIcon className="h-4 w-4" />
                </Link>
                <a
                  href="#features"
                  className={`inline-flex min-h-[48px] items-center justify-center rounded-xl border border-white/25 px-7 text-base font-bold text-white transition-colors hover:bg-white/10 ${focus} focus-visible:ring-offset-slate-950`}
                >
                  اكتشف المنصة
                </a>
              </div>
            </div>

            {/* Decorative composition: illustrative only, no data */}
            <div aria-hidden className="relative mx-auto h-80 w-full max-w-md sm:h-96">
              <div className="absolute inset-x-6 top-6 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/80 text-white"><BookIcon className="h-5 w-5" /></span>
                  <span className="h-3 w-32 rounded-full bg-white/30" />
                </div>
                <div className="space-y-2.5">
                  <span className="block h-2.5 w-full rounded-full bg-white/15" />
                  <span className="block h-2.5 w-5/6 rounded-full bg-white/15" />
                  <span className="block h-2.5 w-2/3 rounded-full bg-white/15" />
                </div>
              </div>
              <div className="absolute bottom-8 start-0 w-52 rotate-[-4deg] rounded-2xl bg-white p-4 shadow-2xl motion-safe:transition-transform">
                <div className="mb-3 flex items-center gap-2 text-violet-700"><FileIcon className="h-5 w-5" /><span className="h-2.5 w-20 rounded-full bg-slate-200" /></div>
                <span className="block h-2 w-full rounded-full bg-slate-100" />
                <span className="mt-2 block h-2 w-3/4 rounded-full bg-slate-100" />
              </div>
              <div className="absolute bottom-0 end-0 w-52 rotate-[3deg] rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 p-4 text-white shadow-2xl">
                <div className="mb-3 flex items-center gap-2"><DocIcon className="h-5 w-5" /><span className="h-2.5 w-16 rounded-full bg-white/40" /></div>
                <span className="block h-2 w-full rounded-full bg-white/25" />
                <span className="mt-2 block h-2 w-2/3 rounded-full bg-white/25" />
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 bg-slate-50 py-16 md:py-24">
          <div className="mx-auto w-full max-w-6xl px-4">
            <h2 className="text-balance text-center text-3xl font-extrabold text-slate-950 sm:text-4xl">
              كل أدواتك الأكاديمية في مكان واحد
            </h2>
            <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ Icon, title, desc }) => (
                <li key={title} className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                  <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="text-lg font-bold text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{desc}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Resources */}
        <section id="resources" className="scroll-mt-20 py-16 md:py-24">
          <div className="mx-auto w-full max-w-6xl px-4">
            <h2 className="text-balance text-center text-3xl font-extrabold text-slate-950 sm:text-4xl">
              موارد تعليمية منظمة
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-8 text-slate-600">
              أنواع المحتوى التي تجمعها Academ في مكان واحد. يظهر لكل حساب ما يخصه فقط بعد تسجيل الدخول.
            </p>
            <ul className="mt-12 grid gap-5 md:grid-cols-3">
              {resources.map(({ Icon, title, desc }) => (
                <li key={title} className="rounded-2xl bg-gradient-to-br from-slate-950 to-indigo-950 p-6 text-white shadow-lg">
                  <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-indigo-200">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="text-lg font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-indigo-100">{desc}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works / about */}
        <section id="about" className="scroll-mt-20 bg-slate-50 py-16 md:py-24">
          <div className="mx-auto w-full max-w-6xl px-4">
            <h2 className="text-balance text-center text-3xl font-extrabold text-slate-950 sm:text-4xl">
              كيف تعمل Academ؟
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-8 text-slate-600">
              منصة موارد أكاديمية خاصة؛ تُنشأ الحسابات من إدارة الكلية، ولا يوجد تسجيل ذاتي.
            </p>
            <ol className="mt-12 grid gap-5 md:grid-cols-3">
              {steps.map((s) => (
                <li key={s.n} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-indigo-700 text-lg font-extrabold text-white">
                    {s.n}
                  </span>
                  <h3 className="text-lg font-bold text-slate-950">
                    {s.href ? (
                      <Link href={s.href} className={`rounded hover:text-indigo-700 hover:underline ${focus}`}>
                        {s.title}
                      </Link>
                    ) : (
                      s.title
                    )}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{s.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="px-4 py-16 md:py-24">
          <div className="mx-auto max-w-4xl rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-800 to-violet-800 px-6 py-14 text-center shadow-xl sm:px-12">
            <h2 className="text-balance text-3xl font-extrabold text-white sm:text-4xl">
              اجعل تجربتك الأكاديمية أكثر تنظيمًا
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-8 text-indigo-100">
              ادخل إلى Academ واكتشف تجربة تعليمية تجمع محتواك الأكاديمي في مكان واحد.
            </p>
            <Link
              href="/login"
              className={`mt-8 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-white px-8 text-base font-bold text-indigo-900 transition-colors hover:bg-indigo-50 ${focus} focus-visible:ring-offset-indigo-800`}
            >
              تسجيل الدخول
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between">
          <div className="max-w-md">
            <Brand />
            <p className="mt-3 text-sm leading-7 text-slate-600">
              منصة أكاديمية عربية تجمع المواد الدراسية والملخصات في مكان واحد منظم.
            </p>
          </div>
          <nav aria-label="روابط التذييل" className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-slate-600">
            <a href="#features" className="hover:text-indigo-700">مميزات المنصة</a>
            <Link href="/login" className="hover:text-indigo-700">تسجيل الدخول</Link>
          </nav>
        </div>
        <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Academ. جميع الحقوق محفوظة.
        </div>
      </footer>
    </div>
  );
}
