"use client";

import type { ChatThread } from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  CalendarCheck,
  Calculator,
  ChevronDown,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MessagesSquare,
  Search,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { createApiClient } from "@/lib/api-client";
import type { InitialUser } from "@/lib/auth-utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/tutors", label: "Tutor Hub", icon: Search },
  { href: "/tcas", label: "TCAS Calc", icon: Calculator },
  { href: "/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/chat", label: "Chat", icon: MessagesSquare },
] as const;

interface Props {
  initialUser: InitialUser | null;
  initialThreads: ChatThread[];
}

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function SiteNav({ initialUser, initialThreads }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<InitialUser | null>(initialUser);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  const threadsQuery = useQuery({
    queryKey: ["chat", "threads"],
    queryFn: () => createApiClient().chat.threads(),
    initialData: initialThreads,
    enabled: !!user,
  });
  const totalUnread = (threadsQuery.data ?? []).reduce(
    (sum, t) => sum + t.unreadCount,
    0,
  );

  const meQuery = useQuery({
    queryKey: ["users", "me"],
    queryFn: () => createApiClient().users.me(),
    enabled: !!user,
    staleTime: 60_000,
    retry: false,
  });
  const isAdmin = meQuery.data?.role === "admin";
  const isTutor = meQuery.data?.role === "tutor";
  const tutorProfileId = meQuery.data?.tutorProfileId;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
        return;
      }
      const meta = (session.user.user_metadata ?? {}) as {
        displayName?: string;
      };
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

  if (pathname === "/" || pathname === "/login" || pathname === "/signup")
    return null;

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-violet-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-violet-200">
              <GraduationCap size={20} />
            </div>
            <div className="flex flex-col">
              <span className="font-josefin font-bold text-[18px] text-violet-700 leading-none tracking-tight">
                Pee Rahat
              </span>
              <span className="text-[9px] font-bold text-violet-400 uppercase tracking-widest mt-0.5">
                Verified EdTech
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const showUnread = item.href === "/chat" && totalUnread > 0;
              return (
                <Link
                  key={item.href}
                  href={item.href as Route}
                  className={cn(
                    "px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2",
                    isActive(item.href)
                      ? "text-violet-500 bg-grape-soft"
                      : "text-neutral-400 hover:text-violet-700 hover:bg-neutral-50",
                  )}
                >
                  <item.icon size={16} />
                  {item.label}
                  {showUnread && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-violet-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {totalUnread > 99 ? "99+" : totalUnread}
                    </span>
                  )}
                </Link>
              );
            })}

            <div className="w-px h-5 bg-neutral-100 mx-3" />

            {user ? (
              <div className="relative" ref={accountRef}>
                <button
                  type="button"
                  onClick={() => setAccountOpen((v) => !v)}
                  className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-2xl bg-neutral-50 hover:bg-neutral-100 transition-all"
                  aria-haspopup="menu"
                  aria-expanded={accountOpen}
                >
                  <span className="w-8 h-8 rounded-xl bg-violet-500 text-white text-xs font-bold flex items-center justify-center">
                    {initialsOf(user.displayName)}
                  </span>
                  <span className="text-xs font-semibold text-neutral-700 max-w-[120px] truncate">
                    {user.displayName}
                  </span>
                  <ChevronDown
                    size={14}
                    className={cn(
                      "text-neutral-400 transition-transform",
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
                      className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-neutral-100 shadow-lg p-2 space-y-1"
                    >
                      <div className="px-3 py-2">
                        <p className="text-xs font-semibold text-neutral-700 truncate">
                          {user.displayName}
                        </p>
                        <p className="text-[10px] text-neutral-400 truncate">
                          {user.email}
                        </p>
                      </div>
                      <div className="h-px bg-neutral-100 mx-1" />
                      <Link
                        href={"/bookings" as Route}
                        onClick={() => setAccountOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
                      >
                        <CalendarCheck size={14} />
                        My Bookings
                      </Link>
                      {isTutor && tutorProfileId ? (
                        <>
                          <Link
                            href={`/tutors/${tutorProfileId}` as Route}
                            onClick={() => setAccountOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
                          >
                            <GraduationCap size={14} />
                            My Profile
                          </Link>
                          <Link
                            href={"/tutors/me/bank" as Route}
                            onClick={() => setAccountOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
                          >
                            <Wallet size={14} />
                            <span className="thai">บัญชีรับเงิน</span>
                          </Link>
                        </>
                      ) : (
                        !isAdmin && (
                          <Link
                            href={"/tutors/onboarding" as Route}
                            onClick={() => setAccountOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
                          >
                            <GraduationCap size={14} />
                            <span className="thai">เป็นพี่ติว (KYC)</span>
                          </Link>
                        )
                      )}
                      {isAdmin && (
                        <Link
                          href={"/admin/kyc" as Route}
                          onClick={() => setAccountOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors"
                        >
                          <ShieldCheck size={14} />
                          Admin
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
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
                className="px-5 py-2 bg-violet-500 text-white rounded-xl text-xs font-bold hover:bg-accent-500 hover:text-neutral-800 shadow-lg shadow-violet-100 transition-all"
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen((v) => !v)}
              className="p-2 text-neutral-700"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden bg-white border-b border-neutral-100 px-4 py-6 space-y-2 shadow-lg"
          >
            {NAV_ITEMS.map((item) => {
              const showUnread = item.href === "/chat" && totalUnread > 0;
              return (
                <Link
                  key={item.href}
                  href={item.href as Route}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    "w-full text-left px-5 py-4 rounded-2xl text-base font-semibold flex items-center gap-4 transition-all",
                    isActive(item.href)
                      ? "bg-grape-soft text-violet-700"
                      : "text-neutral-600 hover:bg-neutral-50",
                  )}
                >
                  <item.icon size={20} />
                  <span className="flex-1">{item.label}</span>
                  {showUnread && (
                    <span className="min-w-[22px] h-[22px] px-2 rounded-full bg-violet-500 text-white text-xs font-bold flex items-center justify-center">
                      {totalUnread > 99 ? "99+" : totalUnread}
                    </span>
                  )}
                </Link>
              );
            })}
            <div className="h-px bg-neutral-100 my-2" />
            {user ? (
              <>
                <div className="px-5 py-3 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-violet-500 text-white text-sm font-bold flex items-center justify-center">
                    {initialsOf(user.displayName)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-700 truncate">
                      {user.displayName}
                    </p>
                    <p className="text-[10px] text-neutral-400 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                {isAdmin && (
                  <Link
                    href={"/admin/kyc" as Route}
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full text-left px-5 py-4 rounded-2xl text-base font-semibold flex items-center gap-4 text-emerald-600 hover:bg-emerald-50 transition-colors"
                  >
                    <ShieldCheck size={20} />
                    Admin
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    void handleSignOut();
                  }}
                  className="w-full text-left px-5 py-4 rounded-2xl text-base font-semibold flex items-center gap-4 text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut size={20} />
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href={"/login" as Route}
                onClick={() => setIsMenuOpen(false)}
                className="w-full text-left px-5 py-4 rounded-2xl text-base font-semibold flex items-center gap-4 bg-violet-500 text-white transition-colors"
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
