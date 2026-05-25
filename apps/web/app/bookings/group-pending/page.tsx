import { redirect } from "next/navigation";

import { createApiClient } from "@/lib/api-client";
import { requireAuth } from "@/lib/auth";

import { TutorGroupInbox } from "./_components/tutor-group-inbox";

/**
 * FR-TH-18: tutor approval inbox. Non-tutors get bounced to /bookings.
 */
export default async function GroupPendingPage() {
  const token = await requireAuth("/bookings/group-pending");
  const api = createApiClient({ accessToken: token });
  const [me, pending] = await Promise.all([
    api.users.me(),
    api.bookings.groupPending().catch(() => []),
  ]);
  if (me.role !== "tutor" && me.role !== "admin") {
    redirect("/bookings");
  }
  return <TutorGroupInbox initial={pending} />;
}
