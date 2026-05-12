"use client";

import type { Tutor } from "@peerahat/types";
import { CalendarPlus } from "lucide-react";
import { useState } from "react";

import { BookingDialog } from "./booking-dialog";

interface Props {
  tutor: Tutor;
  /** "sidebar": large desktop sidebar CTA. "mobile-bar": fixed bottom bar. */
  variant: "sidebar" | "mobile-bar";
}

export function BookingCta({ tutor, variant }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "sidebar" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
        >
          <CalendarPlus size={18} />
          จองคลาส
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex-1 px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
        >
          <CalendarPlus size={16} />
          จองคลาส
        </button>
      )}
      <BookingDialog tutor={tutor} open={open} onOpenChange={setOpen} />
    </>
  );
}
