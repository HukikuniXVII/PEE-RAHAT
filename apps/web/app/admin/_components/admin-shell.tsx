"use client";

import { cn } from "@peerahat/ui";
import {
  BadgeCheck,
  Banknote,
  GraduationCap,
  Receipt,
  ShieldAlert,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ADMIN_ITEMS = [
  { href: "/admin/kyc", label: "ตรวจสอบ KYC", icon: BadgeCheck },
  { href: "/admin/payments", label: "ตรวจสลิป", icon: Receipt },
  { href: "/admin/payouts", label: "Payouts", icon: Banknote },
  { href: "/admin/reports", label: "Reports Queue", icon: ShieldAlert },
  { href: "/admin/tcas/import/criteria", label: "นำเข้า TCAS (AI)", icon: GraduationCap },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="grid md:grid-cols-[220px_1fr] gap-8 md:gap-10">
      <aside className="md:sticky md:top-28 md:self-start">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-3 mb-3">
          Admin
        </p>
        <nav className="space-y-1">
          {ADMIN_ITEMS.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href as Route}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors",
                  active
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50",
                )}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
