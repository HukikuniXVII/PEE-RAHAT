// Deterministic-color initial avatar. Same author always renders with
// the same chip color across the feed, comments, and saved list — no
// data needed beyond the display name. Strip Thai honorifics so "พี่กิ๊ฟ"
// and "น้องกิ๊ฟ" hash by their actual initial.

const PALETTE = [
  "bg-violet-500",
  "bg-soft-periwinkle",
  "bg-rosy-taupe",
  "bg-taupe-deep",
  "bg-emerald-600",
  "bg-rose-600",
  "bg-grape-deep",
  "bg-accent-600",
] as const;

function bgFor(initial: string): string {
  let h = 0;
  for (let i = 0; i < initial.length; i += 1) {
    h = (h * 31 + initial.charCodeAt(i)) >>> 0;
  }
  return PALETTE[h % PALETTE.length] ?? PALETTE[0];
}

function initialOf(name: string): string {
  const stripped = name.replace(/^พี่/, "").replace(/^น้อง/, "");
  return (stripped.slice(0, 1) || "?").toUpperCase();
}

interface Props {
  name: string;
  size?: number;
  badge?: boolean;
  className?: string;
}

export function Avatar({ name, size = 40, badge, className }: Props) {
  const initial = initialOf(name);
  const fontSize = Math.max(13, Math.round(size * 0.42));
  const badgeSize = Math.max(12, Math.round(size * 0.32));
  return (
    <div
      className={`relative shrink-0 ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      <div
        className={`rounded-full flex items-center justify-center text-white font-bold thai ${bgFor(initial)}`}
        style={{ width: size, height: size, fontSize }}
      >
        {initial}
      </div>
      {badge && (
        <span
          className="absolute -bottom-0.5 -right-0.5 rounded-full flex items-center justify-center bg-accent-500 text-grape-deep font-bold border-[1.5px] border-white"
          style={{
            width: badgeSize,
            height: badgeSize,
            fontSize: Math.max(7, Math.round(size * 0.18)),
          }}
          aria-hidden="true"
        >
          ✓
        </span>
      )}
    </div>
  );
}
