"use client";

import { usePathname } from "next/navigation";

// The landing route (`/`) is full-bleed: it paints its own gradient
// background and footer. Every other route lives inside the standard
// max-w-7xl content container. Mirrors the SiteNav / SiteFooter pattern
// of returning null on `/`.
export function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullBleed =
    pathname === "/" || pathname === "/login" || pathname === "/signup";
  return (
    <main
      className={
        isFullBleed ? "" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
      }
    >
      {children}
    </main>
  );
}
