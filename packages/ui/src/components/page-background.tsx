export function PageBackground() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-50 via-[#EDE8F0] to-[#DDD4E8]" />

      {/* Background photo — 35% opacity over the gradient */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/background.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-[0.35]"
      />

      {/* Sparkles — scattered, varied size + opacity */}
      <span className="absolute top-[8%] left-[6%] text-violet-200 text-xl opacity-50">
        ✦
      </span>
      <span className="absolute top-[14%] right-[10%] text-violet-200 text-base opacity-60">
        ✦
      </span>
      <span className="absolute top-[28%] left-[40%] text-violet-200 text-sm opacity-40">
        ✦
      </span>
      <span className="absolute top-[42%] right-[28%] text-violet-200 text-lg opacity-50">
        ✦
      </span>
      <span className="absolute top-[58%] left-[12%] text-violet-200 text-base opacity-45">
        ✦
      </span>
      <span className="absolute bottom-[28%] right-[18%] text-violet-200 text-xl opacity-55">
        ✦
      </span>
      <span className="absolute bottom-[18%] left-[22%] text-violet-200 text-base opacity-40">
        ✦
      </span>
      <span className="absolute bottom-[8%] right-[40%] text-violet-200 text-sm opacity-50">
        ✦
      </span>
      <span className="absolute top-[72%] right-[8%] text-violet-200 text-lg opacity-45">
        ✦
      </span>
      <span className="absolute top-[6%] left-[60%] text-violet-200 text-sm opacity-45">
        ✦
      </span>

      {/* Soft blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-violet-100 opacity-40 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-violet-200 opacity-30 blur-3xl" />
      <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-accent-100 opacity-20 blur-3xl" />
    </div>
  );
}
