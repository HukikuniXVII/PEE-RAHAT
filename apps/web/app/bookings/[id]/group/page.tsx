import { notFound, redirect } from "next/navigation";

import { createApiClient } from "@/lib/api-client";
import { requireAuth } from "@/lib/auth";

import { GroupHostPanel } from "./_components/group-host-panel";

interface Props {
  params: { id: string };
}

/**
 * FR-TH-18: host management view for a group booking. SSR loads the
 * booking + participants so the host sees the live composition + invite
 * link without an extra round-trip. Non-host viewers are bounced to the
 * standard booking detail page (which they can read as invitees once
 * accepted).
 */
export default async function GroupBookingHostPage({ params }: Props) {
  const token = await requireAuth(`/bookings/${params.id}/group`);
  const api = createApiClient({ accessToken: token });
  const [me, booking] = await Promise.all([
    api.users.me(),
    api.bookings.byId(params.id),
  ]);
  if (booking.sessionType !== "group") {
    redirect(`/bookings/${booking.id}` as never);
  }
  if (booking.studentId !== me.id) {
    // Non-hosts see the regular booking page (which already handles
    // viewer-side rendering for participants vs. outsiders).
    redirect(`/bookings/${booking.id}` as never);
  }
  let participants;
  try {
    participants = await api.bookings.participants(params.id);
  } catch {
    notFound();
  }

  return (
    <GroupHostPanel
      booking={booking}
      participants={participants}
      shareBaseUrl={process.env.NEXT_PUBLIC_SITE_URL ?? ""}
    />
  );
}
