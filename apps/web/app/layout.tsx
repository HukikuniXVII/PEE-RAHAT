import type { Metadata, Viewport } from "next";

import { MainShell } from "@/components/main-shell";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { getInitialThreads, getInitialUser } from "@/lib/auth";

import { BugReportButton } from "./_components/bug-report-button";
import { NotificationBell } from "./_components/notification-bell";
import { NotificationSseListener } from "./_components/notification-sse-listener";
import { PushPermissionPrompt } from "./_components/push-permission-prompt";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  // `template` prefixes a child route's own metadata.title (e.g.
  //   "นโยบายความเป็นส่วนตัว" → "นโยบายความเป็นส่วนตัว | PeeRahat").
  // `default` is used for routes that don't export their own title
  // (root /, /tutors, /tcas, /chat, etc.).
  title: {
    template: "%s | PeeRahat",
    default: "PeeRahat - Verified Tutors & Smart TCAS Planner",
  },
  description:
    "เชื่อมต่อเด็ก ม.ปลาย กับพี่รหัสมหาวิทยาลัยชั้นนำ ด้วยระบบพักเงินตัวกลางที่ปลอดภัย",
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
          <MainShell>{children}</MainShell>
          <SiteFooter />
          <ServiceWorkerRegister />
          {/* Floating bug-report launcher — every visitor (auth optional),
              hides itself on /admin/*. Bottom-right so it never competes
              with the top-right notification bell. */}
          <BugReportButton />
          {/* FR-CM-08: floating bell + SSE listener for authed users only.
              The bell is intentionally NOT in the nav per spec — it
              overlays top-right of every page and the listener opens
              an EventSource against /notifications/stream. */}
          {initialUser && (
            <>
              <NotificationBell />
              <NotificationSseListener />
              <PushPermissionPrompt />
            </>
          )}
        </Providers>
      </body>
    </html>
  );
}
