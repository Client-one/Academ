import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";

const sans = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: { default: "Academ | المنصة الأكاديمية", template: "%s" },
  description: "منصة موارد أكاديمية آمنة لطلبة تقنية المعلومات",
  applicationName: "Academ",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Academ | رحلتك الأكاديمية تبدأ من هنا",
    description: "موادك التعليمية وملخصاتك الأكاديمية في تجربة واحدة بسيطة ومنظمة.",
    locale: "ar_AR",
    type: "website",
    siteName: "Academ",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#312e81" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1120" },
  ],
};

// Runs before first paint so there is no light/dark flash. Wrapped in
// try/catch: storage can be unavailable (private mode, blocked cookies).
const themeScript = `(function(){try{var t=localStorage.getItem("academ-theme");if(t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={sans.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-gradient-to-b from-brand-50/60 to-ink-50 bg-fixed font-sans text-ink-900 antialiased">
        {children}
      </body>
    </html>
  );
}
