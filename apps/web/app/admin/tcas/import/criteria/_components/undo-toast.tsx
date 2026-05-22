"use client";

import { CheckCircle2, RotateCcw } from "lucide-react";
import { useEffect } from "react";

// FR-TC-02 — single-shot undo for the most recent bulk apply.
// Auto-dismisses after 10s. Replacing the snapshot on a new bulk apply
// is handled in the parent (only one toast active at a time).

interface Props {
  count: number;
  onUndo: () => void;
  onDismiss: () => void;
  durationMs?: number;
}

export function UndoToast({ count, onUndo, onDismiss, durationMs = 10_000 }: Props) {
  useEffect(() => {
    const t = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(t);
  }, [onDismiss, durationMs]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-8 right-8 z-50
        flex items-center gap-3 px-4 py-3 rounded-lg
        bg-neutral-800 text-neutral-50 shadow-lg
        animate-[toastIn_180ms_ease-out]"
    >
      <CheckCircle2 size={16} className="text-emerald-400" />
      <span className="text-sm">
        อัปเดต <strong>{count} รายการ</strong> เรียบร้อย
      </span>
      <button
        type="button"
        onClick={onUndo}
        className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-accent-500 text-neutral-800 text-xs font-bold hover:bg-accent-600 transition-colors"
      >
        <RotateCcw size={12} />
        ย้อนกลับ
      </button>

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
