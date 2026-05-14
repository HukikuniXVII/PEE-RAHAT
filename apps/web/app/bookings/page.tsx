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
    searchParams.view === "schedule" ? "schedule" : "list";
  const isTutor = me.role === "tutor";
  const heading = isTutor ? "ตารางสอน" : "ตารางเรียน";
  const subtitle = isTutor
    ? "ดูคลาสที่นักเรียนจองและคลาสที่กำลังจะสอน"
    : "ดูคลาสที่จองและประวัติการเรียน";

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="space-y-2">
        <h2 className="text-4xl font-black text-slate-900">{heading}</h2>
        <p className="text-slate-500 font-medium tracking-tight">{subtitle}</p>
      </div>

      <ViewToggle current={view} />

      {view === "list" ? (
        <BookingsList initialBookings={initial} />
      ) : (
        <ScheduleView initialBookings={initial} />
      )}
    </div>
  );
}
