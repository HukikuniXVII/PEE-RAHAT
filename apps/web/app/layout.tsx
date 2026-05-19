import type { Metadata, Viewport } from "next";

import { MainWrapper } from "@/components/main-wrapper";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { getInitialThreads, getInitialUser } from "@/lib/auth";

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [initialUser, initialThreads] = await Promise.all([
    getInitialUser(),
    getInitialThreads(),
  ]);
  return (
    <html lang="th">
      <body className="min-h-screen bg-white text-slate-900 font-sans antialiased">
        <Providers>
          <SiteNav
            initialUser={initialUser}
            initialThreads={initialThreads}
          />
          <MainWrapper>{children}</MainWrapper>
          <SiteFooter />
          <ServiceWorkerRegister />
        </Providers>
      </body>
    </html>
  );
}
