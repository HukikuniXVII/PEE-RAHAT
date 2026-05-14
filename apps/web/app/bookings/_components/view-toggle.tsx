"use client";

import { cn } from "@peerahat/ui";
import { CalendarDays, List } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export type BookingsView = "list" | "schedule";

export function ViewToggle({ current }: { current: BookingsView }) {
  const params = useSearchParams();

  function hrefFor(view: BookingsView): Route {
    // schedule is the implicit default (no view param); only list is explicit.
    const next = new URLSearchParams(params?.toString() ?? "");
    if (view === "schedule") {
      next.delete("view");
    } else {
      next.set("view", view);
    }
    const qs = next.toString();
    return (qs ? `/bookings?${qs}` : "/bookings") as Route;
  }

  const options: { value: BookingsView; label: string; Icon: typeof List }[] = [
    { value: "schedule", label: "ตาราง", Icon: CalendarDays },
    { value: "list", label: "รายการ", Icon: List },
  ];

  return (
    <div
      role="tablist"
      className="inline-flex p-1 bg-slate-100 rounded-2xl gap-1"
    >
      {options.map(({ value, label, Icon }) => {
        const active = current === value;
        return (
          <Link
            key={value}
            role="tab"
            aria-selected={active}
            href={hrefFor(value)}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
              active
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            <Icon size={14} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
