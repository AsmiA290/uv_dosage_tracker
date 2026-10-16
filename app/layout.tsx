import type { Metadata, Viewport } from "next";
import { Noto_Sans, Noto_Sans_Arabic, Noto_Sans_Gujarati, Plus_Jakarta_Sans } from "next/font/google";
import { BottomNav } from "@/components/ui/bottom-nav";
import { LOCALE_BOOT_SCRIPT } from "@/lib/i18n/config";
import { I18nProvider } from "@/lib/i18n/provider";
import "./globals.css";

// Plus Jakarta Sans: soft, rounded letterforms that suit the liquid glass look,
// with tabular figures for the countdown numbers.
const jakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

// Scripts Plus Jakarta Sans does not cover. Each file is fetched only when a
// page actually uses its letters; Chinese and Korean use the phone's own fonts.
const notoSans = Noto_Sans({ subsets: ["cyrillic", "devanagari"], variable: "--font-noto", display: "swap", preload: false });
const notoArabic = Noto_Sans_Arabic({ subsets: ["arabic"], variable: "--font-noto-arabic", display: "swap", preload: false });
const notoGujarati = Noto_Sans_Gujarati({ subsets: ["gujarati"], variable: "--font-noto-gujarati", display: "swap", preload: false });

export const metadata: Metadata = {
  title: "The ActinicUVDose",
  description:
    "Personal UV dose tracking for outdoor workers and athletes in central Illinois: a radiation badge for sunlight. Educational use only; not a diagnostic tool.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

// Light-first by design: this app is read outdoors in direct sunlight, so
// the browser chrome and theme-color should match the light surface, not
// follow the OS dark-mode preference. See globals.css for the same rule
// applied to the app's own CSS tokens.
export const viewport: Viewport = {
  themeColor: "#fafaf9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${jakartaSans.variable} ${notoSans.variable} ${notoArabic.variable} ${notoGujarati.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: LOCALE_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-[var(--background)] font-sans antialiased">
        <I18nProvider>
          {children}
          <BottomNav />
        </I18nProvider>
      </body>
    </html>
  );
}
