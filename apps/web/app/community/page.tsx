import type { CommunityPost, TrendingTag } from "@peerahat/types";
import { PageBackground } from "@peerahat/ui";
import { Users } from "lucide-react";

import { getInitialUser } from "@/lib/auth";
import { createApiClient } from "@/lib/api-client";
import { getServerAccessToken } from "@/lib/supabase/server";

import { CommunityFeed } from "./_components/community-feed";
import { SavedCard } from "./_components/saved-card";
import { TrendingCard } from "./_components/trending-card";

export default async function CommunityPage() {
  const token = await getServerAccessToken();
  const user = await getInitialUser();
  const signedIn = !!user;
  const api = createApiClient({ accessToken: token });

  // Fan-out the three SSR fetches: post list (always), trending (always),
  // and bookmarks (signed-in only — the endpoint requires auth). Anything
  // that throws falls back to a safe empty so a backend hiccup doesn't
  // 500 the whole page.
  const [initial, trendingResult, bookmarksResult] = await Promise.allSettled([
    api.community.list(),
    api.community.trending(5),
    signedIn
      ? api.community.myBookmarks()
      : Promise.resolve<CommunityPost[]>([]),
  ]);

  // Server-log every rejection so silent fallbacks don't mask real
  // regressions in prod. The page still renders with empty data so users
  // see *something* instead of a 500.
  if (initial.status === "rejected") {
    console.error("[community/page] posts list failed:", initial.reason);
  }
  if (trendingResult.status === "rejected") {
    console.error("[community/page] trending failed:", trendingResult.reason);
  }
  if (bookmarksResult.status === "rejected") {
    console.error("[community/page] bookmarks failed:", bookmarksResult.reason);
  }

  const initialPage =
    initial.status === "fulfilled"
      ? initial.value
      : { items: [], total: 0, page: 1, pageSize: 20 };
  const initialTrending: TrendingTag[] =
    trendingResult.status === "fulfilled" ? trendingResult.value : [];
  const initialBookmarks: CommunityPost[] =
    bookmarksResult.status === "fulfilled" ? bookmarksResult.value : [];

  return (
    <>
      <PageBackground photo={false} sparkles="sparse" />

      <div className="mx-auto max-w-[1200px] px-5 md:px-6 py-6 md:py-8">
        {/* Page header */}
        <header className="mb-6 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-grape-soft rounded-full text-[11px] font-bold uppercase tracking-widest text-violet-500">
            <Users size={12} strokeWidth={2.4} />
            ชุมชน TCAS
          </div>
          <h1
            className="thai font-bold text-grape-deep leading-[1.15]"
            style={{
              fontSize: "clamp(28px, 2.6vw, 40px)",
              letterSpacing: "-0.02em",
            }}
          >
            พื้นที่ของพี่รหัสและน้อง ๆ
          </h1>
          <p className="thai text-[14px] text-ink-soft leading-relaxed max-w-[520px]">
            ถามรุ่นพี่ แชร์ประสบการณ์ เก็บโพสต์ที่ใช่ไว้กลับมาอ่าน
          </p>
        </header>

        {/* 2-col layout: 260px rail + fluid feed. Stacks under md. */}
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-5 items-start">
          <aside className="md:sticky md:top-6 space-y-4">
            <TrendingCard initial={initialTrending} />
            <SavedCard initial={initialBookmarks} signedIn={signedIn} />
          </aside>

          <main className="min-w-0">
            <CommunityFeed
              initialPage={initialPage}
              currentDisplayName={user?.displayName ?? null}
            />
          </main>
        </div>
      </div>
    </>
  );
}
