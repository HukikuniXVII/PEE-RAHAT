import { createApiClient } from "@/lib/api-client";
import { getServerAccessToken } from "@/lib/supabase/server";

import { CommunityFeed } from "./_components/community-feed";

export default async function CommunityPage() {
  const token = await getServerAccessToken();
  const api = createApiClient({ accessToken: token });
  const initial = await api.community.list();

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="space-y-1.5">
        <h2 className="text-3xl font-bold text-violet-700">Webboard Community</h2>
        <p className="text-neutral-500 font-medium thai">
          พื้นที่แลกเปลี่ยนเทคนิคการเรียนสำหรับเด็ก TCAS โดยเฉพาะ
        </p>
      </div>
      <CommunityFeed initialPage={initial} />
    </div>
  );
}
