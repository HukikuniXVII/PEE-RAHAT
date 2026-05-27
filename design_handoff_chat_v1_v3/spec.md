# Visual Spec — Chat V1 (Desktop) + V3 (Mobile)

## Tokens
All from `packages/config/tailwind/preset.ts`. No new hex values.

| Token | Hex | Where |
|---|---|---|
| `violet-500` | `#55418B` | Me bubble, primary CTA, send button, active states |
| `grape-deep` | `#3F2F6B` | Counterparty name, headings |
| `grape-soft` | `#EDE8F7` | "Them" bubble border tint, action chip bg, day chips |
| `soft-periwinkle` | `#7D80DA` | University label on thread rows |
| `rosy-taupe` | `#BBA0A0` | Reject button text, redacted pill border |
| `taupe-deep` | `#8E7373` | Admin label, reject text hover |
| `taupe-soft` | `#F0E5E5` | Redacted pill background |
| `accent-500/700` | `#F0CB67 / pill-700` | "รอตอบ" pill |
| `emerald-600` | `#2F9B6E` | Online dot, payment-success chip |
| `ink` | `#2A2240` | Body text |
| `ink-soft` | `#5B5176` | Secondary |
| `ink-mute` | `#8C84A6` | Microcopy, timestamps |

## V1 Desktop

### Layout
- Outer: `h-screen flex flex-col`
- Top bar: 48px tall, white bg, 1px grape-soft/40 bottom border
- Body: grid `340px 1fr`, left rail bg white with 1px grape-soft/40 right border, right pane bg `--color-surface-cream`

### Top bar
- 8x8 violet square (logo) + 16px bold "Pee Rahat" + 11px "แชท" pill (grape-soft)
- Avatar 32px on the right
- Nothing else (no app nav inside this view)

### Left rail
- 4px padding top, 4px sides
- Title row: "ข้อความ" 18px/700 grape-deep · 32x32 "+" violet button
- Search input: 8x12 padding, rounded-full grape-soft bg, 12.5px placeholder
- 3 filter chips: 11.5px/600 rounded-full, 24px tall. Active = violet-500 bg / white text. Inactive = transparent bg + grape-soft border + grape-deep text.
- Thread row: 12x16 padding, 42px avatar, 11px online dot (emerald, white 2px ring), unread numeric pill (violet bg, white text, 10px)
- Active thread: bg grape-soft + 3px violet left border (shift padding-left by -3)

### Conversation header
- 12x20 padding, white/95 + 12px backdrop-blur
- 44px avatar + 11px online dot
- Name 15px/700, optional verified icon 14px violet-500
- Sub: uni + " · ● ออนไลน์"
- Right action: ONE pill "เสนอเวลาเรียนใหม่" — 12px/600, 8x12 padding, rounded-lg, bg grape-soft, color grape-deep, calendar icon 16px

### Messages list
- 12x20 padding, 12px gap
- max-width of conversation column = page (it's the whole grid column)

### Bubble
- Padding 10x14
- 13.5px / line-height 1.55
- Radius: 18px standard, last-corner 4px (sharp) — bottom-right for "me", bottom-left for "them"
- "Them": bg white + 1px grape-soft/40 border, color ink
- "Me": bg violet-500, color white
- max-width: 70% of column
- Timestamp under: 10px ink-mute, "ส่งแล้ว" or "อ่านแล้ว ✓✓" (violet) for me

### Redacted pill
- inline, padding 2x8, rounded 6px, mono 11px
- bg taupe-soft + dashed 1px taupe border + taupe-deep text
- prefix 🔒

### Day divider
- horizontal 1px hairline + centered chip
- chip: bg grape-soft, color grape-deep, 10.5px uppercase tracking-wider

### System cards (success / info / warn)
- Centered, rounded-2xl, 10x16 padding, max-w 480px
- Pastel bg + 1px tinted border + matching fg
- Layout: 18px emoji on left + bold label + optional sub-text

### Booking proposal card
- Centered, ~440px, rounded-2xl, soft shadow
- Subtle gradient bg (`from-violet-100/60 to white`) + 1px violet/30 border
- Header row: 32x32 violet calendar tile + "เสนอเวลาเรียน" tiny caps + author + "● รอตอบรับ" accent pill
- Date block: grape-soft bg, rounded-xl, 12 padding: date 14/700 + time/duration sub
- Subject line bold ink, note paragraph ink-soft
- **No price row.**
- Actions (V1 = horizontal): `เสนอเวลาอื่น` (outline) · `ปฏิเสธ` (taupe text only) · spacer · `ตอบรับ` (violet fill)

### Composer
- 12x16 padding, white bg, 1px grape-soft/40 top border
- 3 small icon buttons (36x36) on the left
- Rounded-2xl textarea on grape-soft/60 bg
- 40x40 violet send button on the right, with soft violet drop-shadow
- Helper text under: 10px ink-mute, "🔒 ทุกข้อความถูกเข้ารหัสและตรวจ bypass อัตโนมัติ · กด Enter เพื่อส่ง"

## V3 Mobile

### Wrapper
- iOS frame (or just a phone-sized container)
- Inner bg: `--color-surface-cream`
- Flex column, full height

### Header
- 12x12 padding, sticky top, white/95 + 12px backdrop-blur, 1px bottom border
- Back chevron 22px violet-500 (negative left margin -4)
- 36px avatar + 10px emerald online dot
- Name 14/700 + verified 12px violet
- Sub: "ออนไลน์ตอนนี้ · มหิดล แพทย์" 10.5px (online state in emerald)
- **No video, no phone, no more, no time-propose button**

### Messages
- Padding 12x12, gap 10
- Bubble padding 8x12, 13px, max-width 78%
- Day chip: 10px/700 uppercase, rounded-full, grape-soft bg

### Booking proposal (mobile)
- Full-width card (bleeds to 12px page margins)
- Header strip: violet-500 bg, 8x12 padding, 11px white text, status pill on right
- Body 12 padding: date 14/700 + time/duration + subject 11.5/700
- 3-column button grid: เสนอเวลาอื่น (outline) · ปฏิเสธ (outline taupe) · ตอบรับ (violet fill)
- **No price row.**

### Typing indicator
- 24px avatar + bubble with 3 pulsing dots
- Animation `chPulse 1.4s infinite` staggered by 200ms

### Composer
- 12x10 padding, white bg, 1px grape-soft/40 top border
- 36x36 round violet-tinted "+" on left
- Pill input (rounded-full), grape-soft/70 bg, smile suffix
- 36x36 round violet send button
- Helper: "🔒 เบอร์/Line จะถูกซ่อนอัตโนมัติ" 9.5px centered

## Z-index / stacking
- Top bar: z 10 (sticky)
- Bubbles, system cards: z 0
- Composer: z 0 (bottom of flex column)
