import { PageBackground } from "@peerahat/ui";
import { Users } from "lucide-react";

import { createApiClient } from "@/lib/api-client";
import { getServerAccessToken } from "@/lib/supabase/server";

import { CommunityFeed } from "./_components/community-feed";

export default async function CommunityPage() {
  const token = await getServerAccessToken();
  const api = createApiClient({ accessToken: token });
  const initial = await api.community.list();

  return (
    <>
      <PageBackground photo={false} sparkles="sparse" />

      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-grape-soft rounded-full text-[10px] font-bold uppercase tracking-widest text-dusty-grape">
            <Users size={12} />
            Webboard
          </div>
          <h1
            className="thai font-bold text-grape-deep leading-[1.15]"
            style={{
              fontSize: "clamp(28px, 2.6vw, 40px)",
              letterSpacing: "-0.02em",
            }}
          >
            ชุมชนเด็ก TCAS
          </h1>
          <p className="thai text-[15px] text-ink-soft leading-relaxed">
            พื้นที่แลกเปลี่ยนเทคนิคการเรียนสำหรับเด็ก TCAS โดยเฉพาะ
          </p>
        </header>

        <CommunityFeed initialPage={initial} />
      </div>
    </>
  );
}
