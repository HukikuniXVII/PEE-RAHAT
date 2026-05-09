import { createApiClient } from "@/lib/api-client";
import { requireAuth } from "@/lib/auth";

import { BookingsList } from "./_components/bookings-list";

export default async function BookingsPage() {
  const token = await requireAuth("/bookings");
  const api = createApiClient({ accessToken: token });
  const initial = await api.bookings.mine();

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20">
      <div className="space-y-2">
        <h2 className="text-4xl font-black text-slate-900">My Bookings</h2>
        <p className="text-slate-500 font-medium tracking-tight">
          ติดตามสถานะคำขอเรียนของคุณ ตั้งแต่ส่งคำขอจนเรียนเสร็จและรับ Badge สำเร็จ
        </p>
      </div>
      <BookingsList initialBookings={initial} />
    </div>
  );
}
