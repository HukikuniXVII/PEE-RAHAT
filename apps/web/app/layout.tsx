import type { Metadata, Viewport } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pee Rahat — Verified EdTech Thailand",
  description:
    "เชื่อมต่อเด็ก ม.ปลาย กับพี่ติวเตอร์มหาวิทยาลัยชั้นนำ ด้วยระบบ Escrow ที่ปลอดภัย",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="min-h-screen bg-white text-slate-900 font-sans antialiased">
        <Providers>
          <SiteNav />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {children}
          </main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
