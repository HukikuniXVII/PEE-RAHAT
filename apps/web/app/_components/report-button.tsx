"use client";

import type { ReportTarget } from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";

import { ReportDialog } from "./report-dialog";

interface Props {
  targetType: ReportTarget;
  targetId: string;
  /** Visible button label. */
  label?: string;
  /** Extra classes for the trigger button. */
  className?: string;
  onReported?: () => void;
}

/**
 * Standalone "report this" trigger (FR-CM-05 / FR-SM-07 / FR-PM-05) — a
 * small flag pill that opens the shared ReportDialog. Entry points with
 * their own menu (chat / reviews / posts) render ReportDialog directly
 * instead. The caller decides visibility: never render this on the
 * viewer's own content.
 */
export function ReportButton({
  targetType,
  targetId,
  label = "รายงาน",
  className,
  onReported,
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-100",
          className,
        )}
      >
        <AlertTriangle size={14} />
        {label}
      </button>
      {open && (
        <ReportDialog
          targetType={targetType}
          targetId={targetId}
          onClose={() => setOpen(false)}
          onReported={onReported}
        />
      )}
    </>
  );
}
