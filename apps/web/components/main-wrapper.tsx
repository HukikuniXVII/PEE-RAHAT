"use client";

import { usePathname } from "next/navigation";

export function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Landing and auth pages manage their own full-screen layout
  const isFullscreen = ["/", "/login", "/signup"].includes(pathname);
  return (
    <main className={isFullscreen ? "" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"}>
      {children}
    </main>
  );
}
