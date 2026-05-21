"use client";

import type { Booking } from "@peerahat/types";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { createApiClient } from "@/lib/api-client";

import { BookingRow } from "./booking-row";

interface Props {
  initialBookings: Booking[];
}

export function BookingsList({ initialBookings }: Props) {
  const { data } = useQuery({
    queryKey: ["bookings", "mine"],
    queryFn: () => createApiClient().bookings.mine(),
    initialData: initialBookings,
  });

  const bookings = data ?? initialBookings;

  if (bookings.length === 0) {
    return (
      <div className="bg-white p-10 rounded-[32px] border border-violet-100 shadow-[0_8px_24px_-16px_rgba(85,65,139,0.25)] max-w-md mx-auto text-center flex flex-col items-center gap-5">
        <div className="space-y-2">
          <h3 className="thai text-xl font-bold text-grape-deep">
            ยังไม่มีรายการจอง
          </h3>
          <p className="thai text-sm text-ink-soft leading-relaxed">
            เริ่มต้นด้วยการเลือกพี่รหัสจาก Tutor Hub แล้วกดจองคลาสได้เลย
          </p>
        </div>
        <Link
          href="/tutors"
          className="thai inline-flex items-center gap-2 rounded-[16px] bg-dusty-grape px-8 py-4 text-[16px] font-bold text-white-smoke shadow-lg transition-all hover:bg-accent-500 hover:text-neutral-800 hover:shadow-lg hover:shadow-accent-500/30"
        >
          ค้นหาพี่รหัสเลย
          <ArrowRight size={16} strokeWidth={2.5} />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <BookingRow key={booking.id} booking={booking} />
      ))}
    </div>
  );
}
