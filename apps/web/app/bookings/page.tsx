import { PageBackground } from "@peerahat/ui";
import { CalendarCheck } from "lucide-react";

import { createApiClient } from "@/lib/api-client";
import { requireAuth } from "@/lib/auth";

import { BookingsList } from "./_components/bookings-list";
import { ScheduleView } from "./_components/schedule-view";
import { type BookingsView, ViewToggle } from "./_components/view-toggle";

interface Props {
  searchParams: { view?: string; week?: string };
}

export default async function BookingsPage({ searchParams }: Props) {
  const token = await requireAuth("/bookings");
  const api = createApiClient({ accessToken: token });
  const [initial, me] = await Promise.all([
    api.bookings.mine(),
    api.users.me(),
  ]);

  const view: BookingsView =
    searchParams.view === "list" ? "list" : "schedule";
  const isTutor = me.role === "tutor";
  const heading = isTutor ? "ตารางสอน" : "ตารางเรียน";
  const subtitle = isTutor
    ? "ดูคลาสที่นักเรียนจองและคลาสที่กำลังจะสอน"
    : "ดูคลาสที่จองและประวัติการเรียน";
  const chip = isTutor ? "Tutor Schedule" : "My Bookings";

  return (
    <>
      <PageBackground photo={false} sparkles="sparse" />

      <div className="max-w-5xl mx-auto space-y-8 pb-20">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-grape-soft rounded-full text-[10px] font-bold uppercase tracking-widest text-dusty-grape">
            <CalendarCheck size={12} />
            {chip}
          </div>
          <h1
            className="thai font-bold text-grape-deep leading-[1.15]"
            style={{
              fontSize: "clamp(28px, 2.6vw, 40px)",
              letterSpacing: "-0.02em",
            }}
          >
            {heading}
          </h1>
          <p className="thai text-[15px] text-ink-soft leading-relaxed">
            {subtitle}
          </p>
        </header>

        <ViewToggle current={view} />

        {view === "schedule" ? (
          <ScheduleView initialBookings={initial} />
        ) : (
          <BookingsList initialBookings={initial} />
        )}
      </div>
    </>
  );
}
