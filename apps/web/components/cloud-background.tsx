"use client";

import { useEffect } from "react";

type Drift = 1 | 2 | 3 | 4;

interface Cloud {
  color: string;
  w: number;
  h: number;
  x: string;
  y: string;
  blur: number;
  opacity: number;
  shape: string;
  drift: Drift;
  dur: number;
  delay: number;
}

// Organic blob border-radius shapes
const S: string[] = [
  "62% 38% 68% 32% / 52% 58% 42% 48%",
  "42% 58% 34% 66% / 62% 38% 58% 42%",
  "72% 28% 48% 52% / 38% 64% 52% 48%",
  "48% 52% 62% 38% / 68% 32% 58% 42%",
];

const THEMES = {
  "dark-purple": {
    bg: "#210B2C",
    clouds: [
      { color: "#55418B", w: 700, h: 520, x: "-14%", y: "-15%", blur: 90, opacity: 0.75, shape: S[0], drift: 1, dur: 13, delay: 0 },
      { color: "#BC8FC8", w: 520, h: 440, x: "52%",  y: "-18%", blur: 80, opacity: 0.55, shape: S[1], drift: 2, dur: 16, delay: 2.5 },
      { color: "#6B2D8B", w: 620, h: 420, x: "8%",   y: "52%",  blur: 88, opacity: 0.65, shape: S[2], drift: 3, dur: 19, delay: 4 },
      { color: "#7D80DA", w: 360, h: 320, x: "62%",  y: "42%",  blur: 72, opacity: 0.45, shape: S[3], drift: 4, dur: 11, delay: 1 },
      { color: "#FFD0DC", w: 280, h: 220, x: "32%",  y: "18%",  blur: 65, opacity: 0.28, shape: S[0], drift: 2, dur: 15, delay: 3 },
    ] as Cloud[],
  },
  "wisteria": {
    bg: "#BC96E6",
    clouds: [
      { color: "#7D80DA", w: 600, h: 480, x: "48%",  y: "-20%", blur: 88, opacity: 0.55, shape: S[1], drift: 1, dur: 14, delay: 0 },
      { color: "#BBA0A0", w: 480, h: 380, x: "-12%", y: "45%",  blur: 78, opacity: 0.5,  shape: S[2], drift: 2, dur: 17, delay: 3 },
      { color: "#FFFFFF", w: 380, h: 320, x: "28%",  y: "30%",  blur: 80, opacity: 0.3,  shape: S[3], drift: 3, dur: 12, delay: 1.5 },
      { color: "#55418B", w: 280, h: 240, x: "-5%",  y: "0%",   blur: 65, opacity: 0.35, shape: S[0], drift: 4, dur: 10, delay: 0.5 },
      { color: "#E8D0F5", w: 320, h: 260, x: "65%",  y: "55%",  blur: 70, opacity: 0.4,  shape: S[1], drift: 2, dur: 20, delay: 5 },
    ] as Cloud[],
  },
  "sunglow": {
    bg: "#FFD166",
    clouds: [
      { color: "#F5F5F5", w: 660, h: 500, x: "-12%", y: "-18%", blur: 90, opacity: 0.55, shape: S[0], drift: 1, dur: 15, delay: 0 },
      { color: "#BBA0A0", w: 500, h: 400, x: "52%",  y: "42%",  blur: 80, opacity: 0.45, shape: S[3], drift: 2, dur: 18, delay: 2 },
      { color: "#FFFFFF", w: 400, h: 340, x: "60%",  y: "-10%", blur: 75, opacity: 0.5,  shape: S[2], drift: 3, dur: 13, delay: 4 },
      { color: "#F0C0A8", w: 320, h: 260, x: "10%",  y: "55%",  blur: 68, opacity: 0.4,  shape: S[1], drift: 4, dur: 11, delay: 1 },
      { color: "#FFFFFF", w: 220, h: 200, x: "35%",  y: "20%",  blur: 60, opacity: 0.35, shape: S[0], drift: 2, dur: 16, delay: 3.5 },
    ] as Cloud[],
  },
} as const;

type Theme = keyof typeof THEMES;

interface Props {
  theme: Theme;
  /** Lock body scroll while this background is mounted (use on the outermost section only). */
  lockBody?: boolean;
}

export function CloudBackground({ theme, lockBody }: Props) {
  const { bg, clouds } = THEMES[theme];

  useEffect(() => {
    if (!lockBody) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [lockBody]);

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: bg }}
      aria-hidden="true"
    >
      {clouds.map((c, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: c.x,
            top: c.y,
            width: c.w,
            height: c.h,
            borderRadius: c.shape,
            background: c.color,
            filter: `blur(${c.blur}px)`,
            opacity: c.opacity,
            animation: `cloud-drift-${c.drift} ${c.dur}s ease-in-out infinite ${c.delay}s`,
            willChange: "transform",
          }}
        />
      ))}
    </div>
  );
}
