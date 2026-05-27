// Faculty | university chip rendered next to verified post authors.
// "verified" variant uses periwinkle (signals "พี่รหัส from a verified
// university"); fallback variant uses taupe so unverified authors still
// get visual context without claiming the same trust signal.

interface Props {
  uni: string;
  verified?: boolean;
  size?: "sm" | "md";
}

export function UniBadge({ uni, verified = true, size = "md" }: Props) {
  const padding = size === "sm" ? "px-1.5 py-0" : "px-2 py-0.5";
  const fontSize = size === "sm" ? "10px" : "10.5px";
  const tone = verified
    ? "bg-[rgba(125,128,218,0.18)] text-violet-500"
    : "bg-taupe-soft text-taupe-deep";
  return (
    <span
      className={`thai inline-flex items-center gap-1 rounded-full font-medium ${padding} ${tone}`}
      style={{ fontSize }}
    >
      {verified && <span style={{ fontSize: 9 }}>✓</span>}
      {uni}
    </span>
  );
}
