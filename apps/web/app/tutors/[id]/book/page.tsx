import { asNotFound, createApiClient } from "@/lib/api-client";
import { requireAuth } from "@/lib/auth";

import { BookingForm } from "./_components/booking-form";

interface Props {
  params: { id: string };
}

export default async function BookTutorPage({ params }: Props) {
  const token = await requireAuth(`/tutors/${params.id}/book`);
  const api = createApiClient({ accessToken: token });
  const tutor = await asNotFound(api.tutors.byId(params.id));

  return <BookingForm tutor={tutor} />;
}
