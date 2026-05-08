import { CommunityFeed } from "@/components/community-feed";
import { createApiClient } from "@/lib/api-client";
import { getServerAccessToken } from "@/lib/supabase/server";

export default async function CommunityPage() {
  const token = await getServerAccessToken();
  const api = createApiClient({ accessToken: token });
  const initial = await api.community.list();

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="space-y-2">
        <h2 className="text-4xl font-black text-slate-900">Webboard Community</h2>
        <p className="text-slate-500 font-medium tracking-tight">
          พื้นที่แลกเปลี่ยนเทคนิคการเรียนสำหรับเด็ก TCAS โดยเฉพาะ
        </p>
      </div>
      <CommunityFeed initial={initial.items} />
    </div>
  );
}
