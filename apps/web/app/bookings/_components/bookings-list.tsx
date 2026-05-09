"use client";

import type { Booking } from "@peerahat/types";
import { useQuery } from "@tanstack/react-query";
import { CalendarX } from "lucide-react";

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
      <div className="bg-white p-12 rounded-[32px] border border-slate-200 text-center space-y-4">
        <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto">
          <CalendarX size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-800">
          ยังไม่มีรายการจอง
        </h3>
        <p className="text-sm text-slate-500">
          เริ่มต้นด้วยการเลือกพี่ติวจาก Tutor Hub แล้วกดจองคลาสได้เลย
        </p>
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
