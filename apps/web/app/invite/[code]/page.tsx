import { notFound } from "next/navigation";

import { createApiClient } from "@/lib/api-client";
import { getServerAccessToken } from "@/lib/supabase/server";

import { InviteLanding } from "./_components/invite-landing";

interface Props {
  params: { code: string };
}

/**
 * FR-TH-18: public landing for group invite codes. SSR fetches the
 * summary so the page renders fully on first load — invitees often arrive
 * via a shared link from chat / line / sms and we want a no-flash render.
 *
 * Auth is intentionally optional here: the summary endpoint is public.
 * The landing client component branches on `viewerUserId` (loaded
 * separately) to render either the accept/decline buttons or a
 * "sign in to accept" CTA.
 */
export default async function InviteCodePage({ params }: Props) {
  const token = await getServerAccessToken();
  const api = createApiClient({ accessToken: token });
  try {
    const summary = await api.invites.summary(params.code);
    return <InviteLanding summary={summary} isAuthed={!!token} />;
  } catch {
    notFound();
  }
}
