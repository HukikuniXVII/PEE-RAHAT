"use client";

import { PlayCircle } from "lucide-react";

interface Props {
  videoUrl?: string;
  posterUrl: string;
  displayName: string;
}

export function IntroVideo({ videoUrl, posterUrl, displayName }: Props) {
  if (videoUrl) {
    return (
      <div className="relative aspect-video w-full rounded-[32px] overflow-hidden bg-slate-900 shadow-lg">
        <video
          src={videoUrl}
          poster={posterUrl}
          controls
          playsInline
          preload="metadata"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Fallback: poster image with a play affordance overlay when intro video is missing.
  return (
    <div className="relative aspect-video w-full rounded-[32px] overflow-hidden bg-slate-900 shadow-lg">
      <img
        src={posterUrl}
        alt={displayName}
        className="absolute inset-0 w-full h-full object-cover opacity-60"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
      <div className="relative h-full flex flex-col items-center justify-center text-white text-center p-6 gap-3">
        <PlayCircle size={56} className="opacity-80" strokeWidth={1.2} />
        <p className="text-sm font-bold opacity-90">
          ยังไม่มีวิดีโอแนะนำตัว
        </p>
        <p className="text-xs opacity-60 max-w-xs">
          พี่ {displayName} ยังไม่ได้อัปโหลดวิดีโอแนะนำตัว แชทถามรายละเอียดเพิ่มเติมได้ก่อนจอง
        </p>
      </div>
    </div>
  );
}
