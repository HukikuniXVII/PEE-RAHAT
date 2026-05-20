"use client";

import { GraduationCap } from "lucide-react";
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
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-violet-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-violet-100">
              <GraduationCap size={20} />
            </div>
            <span className="font-josefin font-bold text-[18px] text-violet-700 tracking-tight">
              Pee Rahat
            </span>
          </Link>

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
