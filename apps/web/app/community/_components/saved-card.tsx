"use client";

import type { CommunityPost } from "@peerahat/types";
import { useQuery } from "@tanstack/react-query";
import { Bookmark } from "lucide-react";

import { createApiClient } from "@/lib/api-client";

import { Avatar } from "./avatar";

interface Props {
  initial: CommunityPost[];
  /** When the viewer is signed-out the rail card still renders, but in
   *  signed-out empty state — we can't show their bookmarks. */
  signedIn: boolean;
}

function relativeShort(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.round(diffMs / 60_000));
  if (mins < 60) return `${mins} นาที`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} ชม.`;
  const days = Math.round(hours / 24);
  return `${days} วัน`;
}

function firstLine(text: string): string {
  return text.split("\n")[0] ?? "";
}

export function SavedCard({ initial, signedIn }: Props) {
  const { data } = useQuery({
    queryKey: ["community", "bookmarks"],
    queryFn: () => createApiClient().community.myBookmarks(),
    initialData: initial,
    enabled: signedIn,
  });

  const saved = (data ?? []).slice(0, 3);

  return (
    <div className="cozy-card overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-[rgba(85,65,139,0.06)]">
        <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent-500 text-grape-deep">
          <Bookmark size={16} strokeWidth={2} fill="currentColor" />
        </span>
        <div className="flex-1">
          <h3 className="thai text-[14px] font-bold leading-tight text-grape-deep">
            ที่บันทึกไว้
          </h3>
          <p className="thai text-[10.5px] text-ink-mute">
            โพสต์ที่เก็บไว้อ่านทีหลัง
          </p>
        </div>
        <span className="num text-[11px] font-bold px-1.5 py-0.5 rounded bg-grape-soft text-grape-deep">
          {data?.length ?? 0}
        </span>
      </div>

      <div>
        {!signedIn ? (
          <div className="px-4 py-6 text-center">
            <p className="text-[20px] mb-1">🔖</p>
            <p className="thai text-[11.5px] text-ink-mute leading-relaxed">
              เข้าสู่ระบบเพื่อบันทึก
              <br />
              โพสต์ที่อยากกลับมาอ่าน
            </p>
          </div>
        ) : saved.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-[20px] mb-1">🔖</p>
            <p className="thai text-[11.5px] text-ink-mute">
              ยังไม่มีโพสต์ที่บันทึก
            </p>
          </div>
        ) : (
          saved.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className={`w-full px-4 py-3 flex items-start gap-2.5 text-left cozy-hover ${
                i > 0 ? "border-t border-[rgba(85,65,139,0.06)]" : ""
              }`}
            >
              <Avatar
                name={p.authorDisplayName}
                size={28}
                badge={p.authorBadge !== "Student"}
              />
              <div className="flex-1 min-w-0">
                <p className="thai text-[11px] font-medium leading-tight text-violet-500 truncate">
                  {p.authorDisplayName}
                </p>
                <p
                  className="thai text-[12px] mt-0.5 leading-snug text-ink"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {firstLine(p.content)}
                </p>
                <p className="thai text-[10px] mt-1 text-ink-mute">
                  บันทึกไว้ {relativeShort(p.createdAt)}ที่แล้ว
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
