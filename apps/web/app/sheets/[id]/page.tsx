import { asNotFound, createApiClient } from "@/lib/api-client";
import { getServerAccessToken } from "@/lib/supabase/server";

import { SheetDetail } from "./_components/sheet-detail";

interface Props {
  params: { id: string };
}

export default async function SheetDetailPage({ params }: Props) {
  const token = await getServerAccessToken();
  const api = createApiClient({ accessToken: token });
  const sheet = await asNotFound(api.sheets.byId(params.id));

  return <SheetDetail sheet={sheet} />;
}
