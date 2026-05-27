"use client";

import type { TrendingTag } from "@peerahat/types";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";

import { createApiClient } from "@/lib/api-client";

interface Props {
  initial: TrendingTag[];
}

function fmtCount(n: number): string {
  if (n >= 1000) {
    return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}k โพสต์`;
  }
  return `${n} โพสต์`;
}

export function TrendingCard({ initial }: Props) {
  const { data } = useQuery({
    queryKey: ["community", "trending"],
    queryFn: () => createApiClient().community.trending(5),
    initialData: initial,
    // Trending recomputes every 15 min on the server side conceptually;
    // refresh client cache on the same cadence so the rail stays warm.
    staleTime: 15 * 60 * 1000,
  });

  const tags = data ?? [];

  return (
    <div className="cozy-card overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-[rgba(85,65,139,0.06)]">
        <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-500 text-white">
          <TrendingUp size={16} strokeWidth={2} />
        </span>
        <div>
          <h3 className="thai text-[14px] font-bold leading-tight text-grape-deep">
            กำลังมาแรง
          </h3>
          <p className="thai text-[10.5px] text-ink-mute">อัปเดตทุก 15 นาที</p>
        </div>
      </div>

      {tags.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-[20px] mb-1">✨</p>
          <p className="thai text-[11.5px] text-ink-mute leading-relaxed">
            ยังไม่มีเทรนด์ในตอนนี้
            <br />
            ลองเริ่มโพสต์พร้อมแท็ก #
          </p>
        </div>
      ) : (
        <div>
          {tags.map((t, i) => (
            <button
              key={t.tag}
              type="button"
              className={`w-full px-4 py-3 flex items-start justify-between gap-2 text-left cozy-hover ${
                i > 0 ? "border-t border-[rgba(85,65,139,0.06)]" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="thai text-[10.5px] text-ink-mute">{t.category}</p>
                <p className="thai text-[13.5px] font-bold inline-flex items-center gap-1 leading-tight text-ink">
                  {t.tag}
                  {i === 0 && (
                    <TrendingUp
                      size={12}
                      strokeWidth={2}
                      className="text-rose-600"
                    />
                  )}
                </p>
                <p className="thai text-[10.5px] mt-0.5 num text-ink-mute">
                  {fmtCount(t.count)}
                </p>
              </div>
              <span
                className={`num text-[11px] font-bold rounded-full px-1.5 py-0.5 shrink-0 ${
                  i < 3
                    ? "bg-grape-soft text-grape-deep"
                    : "bg-transparent text-ink-mute"
                }`}
              >
                #{i + 1}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
