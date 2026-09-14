import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UV Dose Tracker",
  description:
    "Personal UV dose tracking for outdoor workers and athletes in central Illinois — a radiation badge for sunlight. Educational use only; not a diagnostic tool.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#fafaf9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
