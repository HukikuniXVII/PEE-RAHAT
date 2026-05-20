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
  LogOut,
  Menu,
  MessagesSquare,
  Search,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { createApiClient } from "@/lib/api-client";
import type { InitialUser } from "@/lib/auth-utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
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

  const isActive = (href: string) => pathname.startsWith(href);

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
    <nav className="sticky top-0 z-50 bg-white/75 backdrop-blur-xl border-b border-white/40 shadow-[0_1px_0_rgba(85,65,139,0.06)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo — uses /logo.png (1000×400 wordmark) instead of the
              icon+text composition. Click navigates home. */}
          <Link
            href="/"
            className="flex items-center hover:opacity-90 transition-opacity"
          >
            <Image
              src="/logo.png"
              alt="Pee Rahat"
              width={1000}
              height={400}
              priority
              className="h-14 w-auto"
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const showUnread = item.href === "/chat" && totalUnread > 0;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href as Route}
                  className={cn(
                    "px-3 py-2 rounded-xl font-josefin font-bold text-[15px] transition-all duration-200 flex items-center gap-2",
                    active
                      ? "text-violet-500 bg-grape-soft"
                      : "text-violet-700/80 hover:text-dusty-grape hover:bg-grape-soft/60",
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

            <div className="w-px h-5 bg-violet-200/60 mx-3" />

            {user ? (
              <div className="relative" ref={accountRef}>
                <button
                  type="button"
                  onClick={() => setAccountOpen((v) => !v)}
                  className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-2xl bg-white/70 border border-[rgba(85,65,139,0.12)] hover:bg-grape-soft hover:border-[rgba(85,65,139,0.22)] transition-all"
                  aria-haspopup="menu"
                  aria-expanded={accountOpen}
                >
                  <span className="w-8 h-8 rounded-xl bg-violet-500 text-white text-xs font-bold flex items-center justify-center shadow-[0_6px_14px_-6px_rgba(85,65,139,0.5)]">
                    {initialsOf(user.displayName)}
                  </span>
                  <span className="text-xs font-semibold text-violet-700 max-w-[120px] truncate">
                    {user.displayName}
                  </span>
                  <ChevronDown
                    size={14}
                    className={cn(
                      "text-ink-mute transition-transform",
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
                      className="absolute right-0 top-full mt-2 w-64 bg-white/95 backdrop-blur-md rounded-2xl border border-white shadow-[0_18px_40px_-22px_rgba(85,65,139,0.4)] p-2 space-y-1"
                    >
                      {/* Click the name/email header to open the
                          Profile edit page. Visual: subtle hover tint
                          + grape-soft active, so it reads as a target
                          instead of a static label. */}
                      <Link
                        href={"/profile" as Route}
                        onClick={() => setAccountOpen(false)}
                        className="block px-3 py-2 rounded-xl hover:bg-grape-soft transition-colors"
                      >
                        <p className="text-xs font-semibold text-violet-700 truncate">
                          {user.displayName}
                        </p>
                        <p className="text-[10px] text-ink-mute truncate">
                          {user.email}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-dusty-grape mt-1">
                          แก้ไขโปรไฟล์ →
                        </p>
                      </Link>
                      <div className="h-px bg-violet-100 mx-1" />
                      <Link
                        href={"/bookings" as Route}
                        onClick={() => setAccountOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-ink-soft hover:bg-grape-soft hover:text-violet-700 transition-colors"
                      >
                        <CalendarCheck size={14} />
                        My Bookings
                      </Link>
                      {isTutor && tutorProfileId ? (
                        <>
                          <Link
                            href={`/tutors/${tutorProfileId}` as Route}
                            onClick={() => setAccountOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-ink-soft hover:bg-grape-soft hover:text-violet-700 transition-colors"
                          >
                            <GraduationCap size={14} />
                            My Profile
                          </Link>
                          <Link
                            href={"/tutors/me/bank" as Route}
                            onClick={() => setAccountOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-ink-soft hover:bg-grape-soft hover:text-violet-700 transition-colors"
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
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-ink-soft hover:bg-grape-soft hover:text-violet-700 transition-colors"
                          >
                            <GraduationCap size={14} />
                            <span className="thai">เป็นพี่รหัส (KYC)</span>
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
                className="brand-nav-pill font-josefin"
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen((v) => !v)}
              className="p-2 text-violet-700"
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
            className="md:hidden bg-white/95 backdrop-blur-md border-b border-white/60 px-4 py-6 space-y-2 shadow-[0_18px_40px_-22px_rgba(85,65,139,0.3)]"
          >
            {NAV_ITEMS.map((item) => {
              const showUnread = item.href === "/chat" && totalUnread > 0;
              return (
                <Link
                  key={item.href}
                  href={item.href as Route}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    "w-full text-left px-5 py-4 rounded-2xl font-josefin font-bold text-base flex items-center gap-4 transition-all",
                    isActive(item.href)
                      ? "bg-grape-soft text-violet-700"
                      : "text-violet-700/80 hover:bg-grape-soft/60 hover:text-dusty-grape",
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
            <div className="h-px bg-violet-100 my-2" />
            {user ? (
              <>
                <Link
                  href={"/profile" as Route}
                  onClick={() => setIsMenuOpen(false)}
                  className="px-5 py-3 rounded-2xl flex items-center gap-3 hover:bg-grape-soft transition-colors"
                >
                  <span className="w-10 h-10 rounded-xl bg-violet-500 text-white text-sm font-bold flex items-center justify-center shadow-[0_6px_14px_-6px_rgba(85,65,139,0.5)]">
                    {initialsOf(user.displayName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-violet-700 truncate">
                      {user.displayName}
                    </p>
                    <p className="text-[10px] text-ink-mute truncate">
                      {user.email}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-dusty-grape mt-0.5">
                      แก้ไขโปรไฟล์ →
                    </p>
                  </div>
                </Link>
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
                className="w-full text-left px-5 py-4 rounded-2xl font-josefin font-bold text-base flex items-center gap-4 bg-violet-500 text-white hover:bg-grape-deep transition-colors shadow-[0_6px_14px_-6px_rgba(85,65,139,0.5)]"
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
