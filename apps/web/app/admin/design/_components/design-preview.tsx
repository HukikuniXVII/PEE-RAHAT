"use client";

import { cn } from "@peerahat/ui";
import {
  ExternalLink,
  Laptop,
  Monitor,
  RotateCw,
  Smartphone,
  Tablet,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

// Route inventory grouped for the optgroup dropdown. Dynamic params
// use real-ish placeholder ids; you can override any of them via the
// "custom path" input below the dropdown.
type RouteEntry = { path: string; label: string };
type RouteGroup = { label: string; routes: RouteEntry[] };

const ROUTE_GROUPS: RouteGroup[] = [
  {
    label: "Public / landing",
    routes: [
      { path: "/", label: "Landing — /" },
      { path: "/login", label: "Login — /login" },
      { path: "/signup", label: "Signup — /signup" },
    ],
  },
  {
    label: "Static / info",
    routes: [
      { path: "/contact", label: "Contact — /contact" },
      { path: "/help", label: "Help / FAQ — /help" },
      { path: "/legal/privacy", label: "Privacy — /legal/privacy" },
      { path: "/legal/terms", label: "Terms — /legal/terms" },
      { path: "/offline", label: "Offline fallback — /offline" },
    ],
  },
  {
    label: "Account",
    routes: [{ path: "/profile", label: "Edit Profile — /profile" }],
  },
  {
    label: "Tutors",
    routes: [
      { path: "/tutors", label: "Tutor Hub — /tutors" },
      { path: "/tutors/[id]", label: "Tutor profile — /tutors/:id" },
      { path: "/tutors/[id]/book", label: "Book a class — /tutors/:id/book" },
      { path: "/tutors/onboarding", label: "Tutor onboarding — /tutors/onboarding" },
      { path: "/tutors/me/edit", label: "Edit tutor profile — /tutors/me/edit" },
      { path: "/tutors/me/bank", label: "Tutor bank — /tutors/me/bank" },
    ],
  },
  {
    label: "Sheets",
    routes: [
      { path: "/sheets", label: "Sheet marketplace — /sheets" },
      { path: "/sheets/[id]", label: "Sheet detail — /sheets/:id" },
      { path: "/sheets/upload", label: "Upload sheet — /sheets/upload" },
    ],
  },
  {
    label: "Bookings + Chat + Community",
    routes: [
      { path: "/bookings", label: "Bookings — /bookings" },
      { path: "/bookings?view=list", label: "Bookings list view — /bookings?view=list" },
      { path: "/chat", label: "Chat threads — /chat" },
      { path: "/chat?with=[id]", label: "Chat with tutor — /chat?with=:id" },
      { path: "/chat?thread=[id]", label: "Chat by thread — /chat?thread=:id" },
      { path: "/community", label: "Community — /community" },
    ],
  },
  {
    label: "TCAS",
    routes: [{ path: "/tcas", label: "TCAS calculator — /tcas" }],
  },
  {
    label: "Admin",
    routes: [
      { path: "/admin/kyc", label: "KYC queue — /admin/kyc" },
      { path: "/admin/kyc/[id]", label: "KYC review — /admin/kyc/:id" },
      { path: "/admin/payments", label: "Slip queue — /admin/payments" },
      { path: "/admin/payouts", label: "Payouts — /admin/payouts" },
      {
        path: "/admin/payouts/[id]",
        label: "Payout detail — /admin/payouts/:id",
      },
      { path: "/admin/reports", label: "Reports queue — /admin/reports" },
      {
        path: "/admin/tutors/[id]",
        label: "Admin tutor audit — /admin/tutors/:id",
      },
      {
        path: "/admin/tcas/import/criteria",
        label: "TCAS AI import — /admin/tcas/import/criteria",
      },
      { path: "/admin/design", label: "(this page) — /admin/design" },
    ],
  },
];

type Width = "mobile" | "tablet" | "laptop" | "full";

const WIDTH_PRESETS: { value: Width; label: string; px: number | null; icon: typeof Smartphone }[] = [
  { value: "mobile", label: "Mobile (375)", px: 375, icon: Smartphone },
  { value: "tablet", label: "Tablet (768)", px: 768, icon: Tablet },
  { value: "laptop", label: "Laptop (1280)", px: 1280, icon: Laptop },
  { value: "full", label: "Full width", px: null, icon: Monitor },
];

// `[id]` style segments → a usable placeholder so the iframe renders
// something instead of 404'ing. The custom-path input lets you swap in
// a real id from the DB if you need to test against actual data.
function resolvePlaceholders(path: string): string {
  return path
    .replace(/\[id\]/g, "preview")
    .replace(/\[threadId\]/g, "preview");
}

export function DesignPreview() {
  const [selected, setSelected] = useState<string>("/");
  const [customPath, setCustomPath] = useState<string>("");
  const [width, setWidth] = useState<Width>("full");
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const resolved = useMemo(
    () => resolvePlaceholders((customPath.trim() || selected).trim()),
    [selected, customPath],
  );

  const widthPx = WIDTH_PRESETS.find((w) => w.value === width)?.px ?? null;

  const reload = () => {
    // src reassignment forces a hard reload of the same URL.
    if (iframeRef.current) iframeRef.current.src = resolved;
  };

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
          Dev tools · not in production
        </p>
        <h1 className="text-2xl font-black text-slate-900">UI Preview</h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          เลือกหน้าจาก dropdown — เปิดในเฟรมด้านล่างด้วย session ปัจจุบัน
          (ถ้าหน้านั้นบังคับ login จะ redirect ไป /login ตามจริง)
        </p>
      </header>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
        {/* Page selector */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <label className="flex-1 flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Page
            </span>
            <select
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setCustomPath("");
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {ROUTE_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.routes.map((route) => (
                    <option key={route.path} value={route.path}>
                      {route.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <label className="flex-1 flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Custom path (overrides dropdown)
            </span>
            <input
              type="text"
              placeholder="/tutors/abc-123"
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>
        </div>

        {/* Width + actions */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mr-1">
            Width
          </span>
          {WIDTH_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const active = width === preset.value;
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => setWidth(preset.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                  active
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300",
                )}
              >
                <Icon size={13} />
                {preset.label}
              </button>
            );
          })}

          <span className="flex-1" />

          <button
            type="button"
            onClick={reload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 bg-white hover:border-slate-300 transition-all"
          >
            <RotateCw size={13} />
            Reload
          </button>
          <a
            href={resolved}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 bg-white hover:border-slate-300 transition-all"
          >
            <ExternalLink size={13} />
            Open in new tab
          </a>
        </div>

        {/* Resolved path preview */}
        <p className="text-[11px] font-mono text-slate-500 truncate">
          → <span className="text-slate-700 font-bold">{resolved}</span>
        </p>
      </div>

      {/* Iframe pane */}
      <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3 overflow-x-auto">
        <div
          className="mx-auto bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden"
          style={{
            width: widthPx ? `${widthPx}px` : "100%",
            maxWidth: "100%",
          }}
        >
          <iframe
            ref={iframeRef}
            key={resolved}
            src={resolved}
            title={`Preview ${resolved}`}
            className="w-full bg-white"
            style={{ height: "calc(100vh - 280px)", minHeight: "560px" }}
          />
        </div>
      </div>
    </div>
  );
}
