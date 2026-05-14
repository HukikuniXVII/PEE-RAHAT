"use client";

import { PlayCircle } from "lucide-react";

interface Props {
  videoUrl?: string;
  posterUrl: string;
  displayName: string;
}

type Embed =
  | { kind: "youtube" | "vimeo"; src: string }
  | { kind: "file"; src: string };

/**
 * The onboarding form invites tutors to paste a YouTube link, but a native
 * <video> tag won't render those — it only plays direct file URLs. This
 * helper recognizes the common share-link shapes and rewrites them to the
 * provider's embed URL so we can swap to an <iframe>. Direct files
 * (.mp4 / .webm / .mov / .m4v) keep the <video> player. Anything we don't
 * recognize falls back to the "no video" placeholder.
 */
function parseEmbed(url: string): Embed | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");

  // YouTube
  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0];
    if (id) return { kind: "youtube", src: `https://www.youtube.com/embed/${id}` };
  }
  if (host === "youtube.com" || host === "m.youtube.com") {
    if (u.pathname === "/watch") {
      const id = u.searchParams.get("v");
      if (id) return { kind: "youtube", src: `https://www.youtube.com/embed/${id}` };
    }
    if (u.pathname.startsWith("/embed/")) {
      return { kind: "youtube", src: `https://www.youtube.com${u.pathname}` };
    }
    if (u.pathname.startsWith("/shorts/")) {
      const id = u.pathname.split("/")[2];
      if (id) return { kind: "youtube", src: `https://www.youtube.com/embed/${id}` };
    }
  }

  // Vimeo
  if (host === "vimeo.com") {
    const id = u.pathname.slice(1).split("/")[0];
    if (id && /^\d+$/.test(id)) {
      return { kind: "vimeo", src: `https://player.vimeo.com/video/${id}` };
    }
  }
  if (host === "player.vimeo.com" && u.pathname.startsWith("/video/")) {
    return { kind: "vimeo", src: url };
  }

  // Direct file
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(u.pathname)) {
    return { kind: "file", src: url };
  }

  return null;
}

export function IntroVideo({ videoUrl, posterUrl, displayName }: Props) {
  const embed = videoUrl ? parseEmbed(videoUrl) : null;

  if (embed?.kind === "file") {
    return (
      <div className="relative aspect-video w-full rounded-[32px] overflow-hidden bg-slate-900 shadow-lg">
        <video
          src={embed.src}
          poster={posterUrl}
          controls
          playsInline
          preload="metadata"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  if (embed?.kind === "youtube" || embed?.kind === "vimeo") {
    return (
      <div className="relative aspect-video w-full rounded-[32px] overflow-hidden bg-slate-900 shadow-lg">
        <iframe
          src={embed.src}
          title={`วิดีโอแนะนำตัว ${displayName}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>
    );
  }

  // Fallback: no video URL set, or a URL we can't recognise as a playable source.
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
