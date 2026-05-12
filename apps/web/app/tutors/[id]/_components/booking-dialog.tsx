"use client";

import type { Tutor } from "@peerahat/types";
import { Dialog, DialogContent } from "@peerahat/ui";
import { X } from "lucide-react";

import { BookingForm } from "../book/_components/booking-form";

interface Props {
  tutor: Tutor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookingDialog({ tutor, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0 rounded-[28px]">
        <div className="relative max-h-[90vh] overflow-y-auto p-6 sm:p-10">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="ปิด"
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500"
          >
            <X size={18} />
          </button>
          <BookingForm tutor={tutor} onClose={() => onOpenChange(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
