type SparkleDensity = "default" | "sparse" | "none";

type PageBackgroundProps = {
  /** Overlay the auth-page photo at 35% opacity. Defaults to true to
   *  preserve the original login/signup look. App pages typically pass
   *  `photo={false}` so the gradient stays clean behind dense content. */
  photo?: boolean;
  /** Sparkle density. `default` = 10 scattered (auth look), `sparse` = 4
   *  corner accents (content pages), `none` = no sparkles. */
  sparkles?: SparkleDensity;
  /** Render the three soft blobs (top-left violet, bottom-right violet,
   *  mid-right gold). Defaults to true. */
  blobs?: boolean;
};

const SPARKLES_DEFAULT = [
  { className: "top-[8%] left-[6%] text-xl opacity-50" },
  { className: "top-[14%] right-[10%] text-base opacity-60" },
  { className: "top-[28%] left-[40%] text-sm opacity-40" },
  { className: "top-[42%] right-[28%] text-lg opacity-50" },
  { className: "top-[58%] left-[12%] text-base opacity-45" },
  { className: "bottom-[28%] right-[18%] text-xl opacity-55" },
  { className: "bottom-[18%] left-[22%] text-base opacity-40" },
  { className: "bottom-[8%] right-[40%] text-sm opacity-50" },
  { className: "top-[72%] right-[8%] text-lg opacity-45" },
  { className: "top-[6%] left-[60%] text-sm opacity-45" },
];

const SPARKLES_SPARSE = [
  { className: "top-[10%] left-[8%] text-lg opacity-45" },
  { className: "top-[14%] right-[12%] text-base opacity-50" },
  { className: "bottom-[16%] left-[16%] text-base opacity-40" },
  { className: "bottom-[10%] right-[20%] text-lg opacity-50" },
];

export function PageBackground({
  photo = true,
  sparkles = "default",
  blobs = true,
}: PageBackgroundProps = {}) {
  const sparkleSet =
    sparkles === "none"
      ? []
      : sparkles === "sparse"
        ? SPARKLES_SPARSE
        : SPARKLES_DEFAULT;

  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-surface-cream via-surface-mist to-surface-dusk" />

      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/background.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-[0.35]"
        />
      )}

      {sparkleSet.map((s, i) => (
        <span
          key={i}
          className={`absolute text-violet-200 ${s.className}`}
        >
          ✦
        </span>
      ))}

      {blobs && (
        <>
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-violet-100 opacity-40 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-violet-200 opacity-30 blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-accent-100 opacity-20 blur-3xl" />
        </>
      )}
    </div>
  );
}
