"use client";

import type { Tutor } from "@peerahat/types";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus, Pencil } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createApiClient } from "@/lib/api-client";

import { BookingDialog } from "./booking-dialog";

interface Props {
  tutor: Tutor;
  /** "sidebar": large desktop sidebar CTA. "mobile-bar": fixed bottom bar. */
  variant: "sidebar" | "mobile-bar";
}

export function BookingCta({ tutor, variant }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // FR-TH-06: hide the CTA when viewer is the tutor themselves. Backend
  // also rejects self-booking with 403, but surfacing it client-side keeps
  // the affordance honest.
  const meQuery = useQuery({
    queryKey: ["users", "me"],
    queryFn: () => createApiClient().users.me(),
    staleTime: 60_000,
    retry: false,
  });
  const isOwnProfile = meQuery.data?.tutorProfileId === tutor.id;
  const isAuthed = !!meQuery.data;
  const loginHref = `/login?next=${encodeURIComponent(`/tutors/${tutor.id}`)}` as Route;

  const handleBookClick = () => {
    if (meQuery.isPending) return;
    if (!isAuthed) {
      router.push(loginHref);
      return;
    }
    setOpen(true);
  };

  if (isOwnProfile) {
    if (variant === "mobile-bar") return null;
    return (
      <Link
        href="/tutors/me/edit"
        className="w-full px-6 py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
      >
        <Pencil size={16} />
        แก้ไขโปรไฟล์
      </Link>
    );
  }

  return (
    <>
      {variant === "sidebar" ? (
        <button
          type="button"
          onClick={handleBookClick}
          disabled={meQuery.isPending}
          className="w-full px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <CalendarPlus size={18} />
          จองคลาส
        </button>
      ) : (
        <button
          type="button"
          onClick={handleBookClick}
          disabled={meQuery.isPending}
          className="flex-1 px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <CalendarPlus size={16} />
          จองคลาส
        </button>
      )}
      {isAuthed && (
        <BookingDialog tutor={tutor} open={open} onOpenChange={setOpen} />
      )}
    </>
  );
}
