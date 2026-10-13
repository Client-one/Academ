import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/public/brand";
import { HeroArt } from "@/components/public/hero-art";
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
  { Icon: DocIcon, title: "المقالات والملخصات", desc: "ملخصات ومواد أكاديمية منشورة، مصنّفة بوضوح بين الرسمي والطلابي." },
  { Icon: FileIcon, title: "ملفات تعليمية", desc: "الوصول إلى الملفات التعليمية المسموح بها بحسب صلاحيات المستخدم." },
  { Icon: SearchIcon, title: "بحث منظم", desc: "البحث عن المواد والمحتوى الأكاديمي المتاح لحسابك." },
  { Icon: LayersIcon, title: "تنظيم أكاديمي", desc: "تنظيم المحتوى بحسب المستويات والفصول والمقررات المدعومة حاليًا." },
  { Icon: ShieldIcon, title: "وصول آمن", desc: "المحتوى المحمي متاح للمستخدمين المصرح لهم فقط." },
];

const resources = [
  { Icon: BookIcon, title: "المواد الدراسية", desc: "مقررات مرتبة في محاور ومواد بحسب مستواك وفصلك." },
  { Icon: DocIcon, title: "المقالات والملخصات", desc: "ملخصات ومواد طلابية ورسمية، موسومة بنوعها لتعرف مصدر كل مادة." },
  { Icon: FileIcon, title: "ملفات PDF والملفات التعليمية", desc: "ملفات رسمية وصور يمكن تنزيلها وفق صلاحياتك." },
];

const steps = [
  { n: "١", title: "سجّل الدخول", desc: "اختر نوع حسابك للوصول إلى المنصة.", href: "/login" },
  { n: "٢", title: "اكتشف محتواك الأكاديمي", desc: "تصفح المواد والمقررات المتاحة لحسابك." },
  { n: "٣", title: "ابدأ رحلتك التعليمية", desc: "نزّل المواد والملفات المسموح بها وفق صلاحياتك." },
];

const focus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2";

export default function LandingPage() {
  return (
    <div className="bg-ink-50 text-ink-900">
      <LandingHeader />
      <main>
        {/* Hero */}
        <section id="home" className="scroll-mt-20">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-14 md:py-24 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center rounded-full bg-brand-100 px-4 py-1.5 text-sm font-bold text-brand-800 dark:text-brand-300">
                منصة أكاديمية عربية
              </span>
              <h1 className="mt-5 text-balance text-4xl font-extrabold leading-tight text-ink-950 sm:text-5xl lg:text-6xl lg:leading-[1.2]">
                رحلتك الأكاديمية تبدأ من هنا
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-9 text-ink-600">
                كل ما تحتاجه لتنظيم دراستك والوصول إلى موادك التعليمية وملخصاتك الأكاديمية، في تجربة واحدة بسيطة ومنظمة.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/login"
                  className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-brand-700 px-7 text-base font-bold text-white shadow-sm transition-colors hover:bg-brand-800 ${focus}`}
                >
                  ابدأ الآن
                  <ArrowIcon className="h-4 w-4" />
                </Link>
                <a
                  href="#features"
                  className={`inline-flex min-h-[48px] items-center justify-center rounded-xl border border-ink-300 bg-white px-7 text-base font-bold text-ink-800 transition-colors hover:bg-ink-100 ${focus}`}
                >
                  اكتشف المنصة
                </a>
              </div>
            </div>
            <HeroArt />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 border-y border-ink-200 bg-white py-16 md:py-24">
          <div className="mx-auto w-full max-w-6xl px-4">
            <h2 className="text-balance text-center text-3xl font-extrabold text-ink-950 sm:text-4xl">
              كل أدواتك الأكاديمية في مكان واحد
            </h2>
            <ul className="reveal mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ Icon, title, desc }) => (
                <li key={title} className="flex h-full flex-col rounded-2xl border border-ink-200 bg-ink-50 p-6 transition-colors hover:border-brand-400">
                  <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-800 dark:text-brand-300">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="text-lg font-bold text-ink-950">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-ink-600">{desc}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Resources */}
        <section id="resources" className="scroll-mt-20 py-16 md:py-24">
          <div className="mx-auto w-full max-w-6xl px-4">
            <h2 className="text-balance text-center text-3xl font-extrabold text-ink-950 sm:text-4xl">
              موارد تعليمية منظمة
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-8 text-ink-600">
              أنواع المحتوى التي تجمعها Academ في مكان واحد. يظهر لكل حساب ما يخصه فقط بعد تسجيل الدخول.
            </p>
            <ul className="reveal mt-12 grid gap-5 md:grid-cols-3">
              {resources.map(({ Icon, title, desc }, i) => (
                <li key={title} className="rounded-2xl border border-brand-200 bg-brand-50 p-6">
                  <span className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${i === 1 ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200" : "bg-white text-brand-800 dark:text-brand-300"}`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="text-lg font-bold text-ink-950">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-ink-600">{desc}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works / about */}
        <section id="about" className="scroll-mt-20 border-y border-ink-200 bg-white py-16 md:py-24">
          <div className="mx-auto w-full max-w-6xl px-4">
            <h2 className="text-balance text-center text-3xl font-extrabold text-ink-950 sm:text-4xl">
              كيف تعمل Academ؟
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-8 text-ink-600">
              منصة موارد أكاديمية خاصة؛ تُنشأ الحسابات من إدارة الكلية، ولا يوجد تسجيل ذاتي.
            </p>
            <ol className="reveal mt-12 grid gap-5 md:grid-cols-3">
              {steps.map((s) => (
                <li key={s.n} className="rounded-2xl border border-ink-200 bg-ink-50 p-6">
                  <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-brand-700 text-lg font-extrabold text-white">
                    {s.n}
                  </span>
                  <h3 className="text-lg font-bold text-ink-950">
                    {s.href ? (
                      <Link href={s.href} className={`rounded hover:text-brand-700 hover:underline dark:hover:text-brand-300 ${focus}`}>
                        {s.title}
                      </Link>
                    ) : (
                      s.title
                    )}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-ink-600">{s.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="px-4 py-16 md:py-24">
          <div className="reveal mx-auto max-w-4xl rounded-3xl bg-brand-700 px-6 py-14 text-center sm:px-12">
            <h2 className="text-balance text-3xl font-extrabold text-white sm:text-4xl">
              اجعل تجربتك الأكاديمية أكثر تنظيمًا
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-8 text-brand-100">
              ادخل إلى Academ واكتشف تجربة تعليمية تجمع محتواك الأكاديمي في مكان واحد.
            </p>
            <Link
              href="/login"
              className={`mt-8 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-[#fff] px-8 text-base font-bold text-[#21493e] transition-colors hover:bg-[#f0f7f4] ${focus} focus-visible:ring-offset-brand-700`}
            >
              تسجيل الدخول
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between">
          <div className="max-w-md">
            <Brand />
            <p className="mt-3 text-sm leading-7 text-ink-600">
              منصة أكاديمية عربية تجمع المواد الدراسية والملخصات في مكان واحد منظم.
            </p>
          </div>
          <nav aria-label="روابط التذييل" className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-ink-600">
            <a href="#features" className="hover:text-brand-700 dark:hover:text-brand-300">مميزات المنصة</a>
            <Link href="/login" className="hover:text-brand-700 dark:hover:text-brand-300">تسجيل الدخول</Link>
          </nav>
        </div>
        <div className="border-t border-ink-100 py-4 text-center text-xs text-ink-500">
          © {new Date().getFullYear()} Academ. جميع الحقوق محفوظة.
        </div>
      </footer>
    </div>
  );
}
