import { createApiClient } from "@/lib/api-client";
import { getServerAccessToken } from "@/lib/supabase/server";

import { BookingForm } from "./_components/booking-form";

interface Props {
  params: { id: string };
}

export default async function BookTutorPage({ params }: Props) {
  const token = await getServerAccessToken();
  const api = createApiClient({ accessToken: token });
  const tutor = await api.tutors.byId(params.id);

  return <BookingForm tutor={tutor} />;
}
