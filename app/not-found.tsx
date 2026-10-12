import Link from "next/link";
import { SearchIcon } from "@/components/public/icons";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <SearchIcon className="h-8 w-8" />
        </span>
        <h1 className="text-2xl font-extrabold text-ink-950">الصفحة غير موجودة</h1>
        <p className="mt-2 text-sm text-ink-500">ربما تغيّر الرابط أو لم يعد المحتوى متاحًا.</p>
        <Link href="/" className="mt-6 inline-flex min-h-[44px] items-center rounded-xl bg-brand-700 px-6 font-bold text-white hover:bg-brand-800">
          العودة للرئيسية
        </Link>
      </div>
    </main>
  );
}
