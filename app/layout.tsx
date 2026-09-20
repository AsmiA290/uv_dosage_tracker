import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { BottomNav } from "@/components/ui/bottom-nav";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "UV Dose Tracker",
  description:
    "Personal UV dose tracking for outdoor workers and athletes in central Illinois — a radiation badge for sunlight. Educational use only; not a diagnostic tool.",
  manifest: "/manifest.json",
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
    <html lang="en" data-theme="light" className={geistSans.variable}>
      <body className="min-h-screen bg-[var(--background)] font-sans antialiased">
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
