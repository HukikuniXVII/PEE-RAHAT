# Visual Spec — V2 Community + Mini-Profile Overlay

## Page chrome
- Page max-width: 1200px, centered, 24px padding (vertical/horizontal)
- 2-col grid: `260px 1fr` with 20px gap
- Backdrop: shared `<PageBackground photo={false} sparkles="sparse"/>`

## Card primitive (`.cs-card`)
- `bg-white`
- `rounded-2xl` (20px)
- `border 1px rgba(85,65,139,0.08)`
- shadow: `0 1px 0 rgba(85,65,139,0.04), 0 12px 28px -18px rgba(85,65,139,0.22)`

## Left rail
- Sticky top:24
- Two cards stacked with 16px gap
- Width fixed 260px

### Trending card
- Header strip 56px (icon tile 32px + 2-line title)
- Row 60px each, 5 rows, hover bg `rgba(85,65,139,0.04)`
- Rank pill: 22px tall, top-3 = grape-soft bg, rest = transparent

### Saved card
- Same header pattern; icon tile uses `bg-accent-500 text-grape-deep` with filled bookmark
- Row 76px each
- Count badge (right of header): grape-soft pill, tabular-nums

## Feed composer
- Padded card 16px
- 40px avatar + flexible textarea (2 rows min)
- Action row above border-top: 13px semibold buttons (emerald/violet), Post pill right-aligned

## Post card
- Padded sections; no card-internal margin between sections (each section pads itself)
- Author header: 44px avatar, name 14px/700, meta 11.5px
- Body: 14.5px / line-height 1.6 / whitespace pre-line / Thai hashtags = violet-500 medium
- Reaction summary: 12px ink-mute, emoji-stack avatars 18px overlapping -5px
- Action row: 3 equal-width buttons, 13px semibold, icon 16px, hover bg `rgba(85,65,139,0.06)`. Active color matches the action (rose / periwinkle / accent-600)

## Mini-Profile Overlay

### Shell
- Backdrop: `rgba(42,34,64,0.42)` + `backdrop-filter: blur(6px)`
- Card width: 440 (student) / 520 (tutor)
- Card max-height: 90vh
- Layout: column flex — gradient header band → avatar/identity overlap → scrollable body
- Open animation: 250ms `cubic-bezier(.2,.7,.3,1)`, opacity 0→1 + translateY 4→0

### Gradient header band
- 60px decorative band (no text label)
- Student: `linear-gradient(135deg, taupe 0%, violet-500 130%)`
- Tutor: `linear-gradient(135deg, violet-500 0%, taupe 130%)` (reversed)
- Sparkle decoration: 32px, opacity 0.18, top:10 right:60
- Close button: 32px circle, white/20% bg, top-right

### Avatar block
- 76px avatar, 4px white ring, overlaps band by -42px
- Name 18px/700, tracking-tight
- Handle + subtitle on one line 12px/400, ink-soft

### Body padding
- 24px horizontal, 16px top, 24px bottom
- Sections separated by 16px vertical rhythm

### Section label
- 10.5px Thai font, weight 700, uppercase, tracking-wider, color ink-mute
- 8px bottom margin

### Stat strip
- Grid 3 cols (student) or 4 cols (tutor) with 8px gap
- Each cell: 8px padding, rounded-lg, bg-violet-500/5 (very subtle)
- Value: 15px/700 grape-deep (or accent-600 with ★ for rating), tabular-nums
- Label: 10px ink-mute, 4px above

### Ranking strip (tutor only)
- Horizontal gradient `accent-500/30 → soft-periwinkle/15`
- 18px trophy emoji + 12px Thai text
- "อันดับ #2" bold grape-deep, tag bold violet-500

### Chip cluster
- Pills 11.5px/600, 2.5x1 padding, rounded-full
- "solid" variant (tutor subjects) = grape-soft bg + grape-deep text
- "outline" variant (student interests) = white-ish bg + 1px hairline border

### Review card
- Bordered neutral-50 card, 12px padding
- Avatar 26px + name + 5 stars (accent-600) + time
- Body 12px italic-feel paragraph, quoted

### Avatar stack
- 5 avatars 28px, -8px overlap, 2px white ring
- Trailing copy: "และอีก N คน · ส่วนใหญ่ติด ..."

### Top-sheet card (tutor)
- 40×48 sheet thumbnail (faux stripes for paper)
- Title 12px/700 + stats line + price (right-aligned, tabular-nums)

### Footer note
- Centered 10.5px ink-mute
- Student: 🌸 join time
- Tutor: 🛡️ KYC + ทรานสคริปต์ + join time

## Action buttons
**None.** The overlay is display-only. Do not add CTAs like จองเรียน / ติดตาม / ส่งข้อความ to this surface. They live elsewhere (tutor profile page, follow button on the post header).

## Z-index / stacking
- Page content: z 0
- Overlay backdrop: z 30
- Overlay card: z 30 (above backdrop, contained within same stacking context)

## Color reference

| Token | Hex |
|---|---|
| `violet-500` | `#55418B` |
| `grape-deep` | `#3F2F6B` |
| `grape-soft` | `#EDE8F7` |
| `soft-periwinkle` | `#7D80DA` |
| `rosy-taupe` | `#BBA0A0` |
| `accent-500/600` | `#F0CB67 / #ECBE42` |
| `emerald-600` | `#2F9B6E` |
| `rose-600` | `#D9436E` |
| `ink` | `#2A2240` |
| `ink-soft` | `#5B5176` |
| `ink-mute` | `#8C84A6` |
