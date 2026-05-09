"use client";

import { cn } from "@peerahat/ui";
import { AnimatePresence, motion } from "motion/react";
import {
  BookOpen,
  CalendarCheck,
  Calculator,
  ChevronDown,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Users,
  X,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { InitialUser } from "@/lib/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/tutors", label: "Tutor Hub", icon: Search },
  { href: "/sheets", label: "Sheets", icon: BookOpen },
  { href: "/tcas", label: "TCAS Calc", icon: Calculator },
  { href: "/community", label: "Webboard", icon: Users },
  { href: "/bookings", label: "Bookings", icon: CalendarCheck },
] as const;

interface Props {
  initialUser: InitialUser | null;
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

export function SiteNav({ initialUser }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<InitialUser | null>(initialUser);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
        return;
      }
      const meta = (session.user.user_metadata ?? {}) as { displayName?: string };
      const fallback = session.user.email?.split("@")[0] ?? "User";
      setUser({
        displayName: meta.displayName ?? fallback,
        email: session.user.email ?? "",
      });
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!accountOpen) return;
    const onClick = (e: MouseEvent) => {
      if (
        accountRef.current &&
        !accountRef.current.contains(e.target as Node)
      ) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [accountOpen]);

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    setAccountOpen(false);
    router.push("/");
    router.refresh();
  };

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
                href={item.href as Route}
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
            {user ? (
              <div className="relative" ref={accountRef}>
                <button
                  type="button"
                  onClick={() => setAccountOpen((v) => !v)}
                  className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all"
                  aria-haspopup="menu"
                  aria-expanded={accountOpen}
                >
                  <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
                    {initialsOf(user.displayName)}
                  </span>
                  <span className="text-xs font-bold text-slate-700 max-w-[120px] truncate">
                    {user.displayName}
                  </span>
                  <ChevronDown
                    size={14}
                    className={cn(
                      "text-slate-400 transition-transform",
                      accountOpen && "rotate-180",
                    )}
                  />
                </button>
                <AnimatePresence>
                  {accountOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      role="menu"
                      className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-slate-100 shadow-xl p-2 space-y-1"
                    >
                      <div className="px-3 py-2">
                        <p className="text-xs font-bold text-slate-700 truncate">
                          {user.displayName}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {user.email}
                        </p>
                      </div>
                      <div className="h-px bg-slate-100 mx-1" />
                      <Link
                        href={"/bookings" as Route}
                        onClick={() => setAccountOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
                      >
                        <CalendarCheck size={14} />
                        My Bookings
                      </Link>
                      <Link
                        href={"/tutors/onboarding" as Route}
                        onClick={() => setAccountOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
                      >
                        <GraduationCap size={14} />
                        เป็นพี่ติว (KYC)
                      </Link>
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50"
                      >
                        <LogOut size={14} />
                        Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                href={"/login" as Route}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-black shadow-xl shadow-slate-200 transition-all uppercase tracking-widest"
              >
                Login
              </Link>
            )}
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
                href={item.href as Route}
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
            <div className="h-px bg-slate-100 my-2" />
            {user ? (
              <>
                <div className="px-5 py-3 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
                    {initialsOf(user.displayName)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-700 truncate">
                      {user.displayName}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    void handleSignOut();
                  }}
                  className="w-full text-left px-5 py-4 rounded-2xl text-base font-bold flex items-center gap-4 text-rose-600 hover:bg-rose-50"
                >
                  <LogOut size={20} />
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href={"/login" as Route}
                onClick={() => setIsMenuOpen(false)}
                className="w-full text-left px-5 py-4 rounded-2xl text-base font-bold flex items-center gap-4 bg-slate-900 text-white"
              >
                <LogOut size={20} className="rotate-180" />
                Login
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
