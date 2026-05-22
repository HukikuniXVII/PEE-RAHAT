"use client";

import { Pencil, X } from "lucide-react";

// FR-TC-02 — floating bar that appears above the existing commit bar
// whenever rows are checked in the AI-import preview table.

interface Props {
  count: number;
  onEdit: () => void;
  onClear: () => void;
}

export function BulkActionBar({ count, onEdit, onClear }: Props) {
  if (count === 0) return null;

  return (
    <div
      role="region"
      aria-label={`${count} รายการที่เลือก`}
      className="fixed left-1/2 -translate-x-1/2 bottom-24 z-40
        flex items-center gap-3 min-w-[480px] max-w-[90vw]
        px-5 py-3 rounded-xl bg-violet-500 text-neutral-50 shadow-lg
        animate-[slideUp_220ms_cubic-bezier(0.34,1.3,0.64,1)]"
      style={{
        // Inline keyframes — Tailwind doesn't ship a slide-up by default
        // and we don't want to extend the shared preset just for this.
        // (Keyframes are injected globally below this comment via a style tag.)
      }}
    >
      <span className="text-sm font-medium">
        {count} รายการที่เลือก
      </span>
      <span className="h-5 w-px bg-violet-100/40" aria-hidden />
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-neutral-50 text-violet-700 text-sm font-medium hover:bg-accent-500 hover:text-neutral-800 transition-colors"
      >
        <Pencil size={14} />
        แก้ไขพร้อมกัน
      </button>
      <button
        type="button"
        onClick={onClear}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-neutral-50/40 text-sm font-medium hover:bg-violet-600 transition-colors"
      >
        <X size={14} />
        ล้างการเลือก
      </button>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, 32px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}
