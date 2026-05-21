"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname === "/" || pathname === "/login" || pathname === "/signup")
    return null;

  return (
    <footer className="bg-neutral-50 border-t border-neutral-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="flex justify-center">
          <div className="flex gap-8 text-sm font-semibold text-neutral-400">
            <Link
              href={"/legal/terms" as Route}
              className="hover:text-violet-500 transition-colors"
            >
              Terms
            </Link>
            <Link
              href={"/legal/privacy" as Route}
              className="hover:text-violet-500 transition-colors"
            >
              Privacy
            </Link>
            <Link
              href={"/contact" as Route}
              className="hover:text-violet-500 transition-colors"
            >
              Contact
            </Link>
            <Link
              href={"/help" as Route}
              className="hover:text-violet-500 transition-colors"
            >
              Help
            </Link>
          </div>
        </div>

        <div className="pt-8 border-t border-neutral-200 text-center space-y-1.5">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.3em]">
            DBD Registered E-commerce Thailand
          </p>
          <p className="text-[10px] font-bold text-neutral-300 uppercase tracking-[0.3em]">
            © 2026 Pee Rahat Thailand
          </p>
        </div>
      </div>
    </footer>
  );
}
