"use client";

import { cn } from "@peerahat/ui";
import { AnimatePresence, motion } from "motion/react";
import {
  BookOpen,
  Calculator,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Search,
  Users,
  X,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/tutors", label: "Tutor Hub", icon: Search },
  { href: "/sheets", label: "Sheets", icon: BookOpen },
  { href: "/tcas", label: "TCAS Calc", icon: Calculator },
  { href: "/community", label: "Webboard", icon: Users },
] as const;

export function SiteNav() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-200">
              <GraduationCap size={24} />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tighter text-slate-900 leading-none">
                Pee Rahat
              </span>
              <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest mt-1">
                Verified EdTech
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2",
                  isActive(item.href)
                    ? "text-indigo-600 bg-indigo-50"
                    : "text-slate-400 hover:text-slate-800 hover:bg-slate-50",
                )}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            ))}
            <div className="w-px h-6 bg-slate-100 mx-4" />
            <Link
              href={"/login" as Route}
              className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-black shadow-xl shadow-slate-200 transition-all uppercase tracking-widest"
            >
              Login
            </Link>
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen((v) => !v)}
              className="p-2 text-slate-800"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden bg-white border-b border-slate-100 px-4 py-6 space-y-2 shadow-2xl"
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={cn(
                  "w-full text-left px-5 py-4 rounded-2xl text-base font-bold flex items-center gap-4 transition-all",
                  isActive(item.href)
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50",
                )}
              >
                <item.icon size={22} />
                {item.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
