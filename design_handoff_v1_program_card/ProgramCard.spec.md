# ProgramCard — Visual Spec Sheet

Quick-reference dimensions, colors, and typography. Cross-reference with `ProgramCard.tsx` for the React implementation.

## Card Surface

| Property | Value | Tailwind/Token |
|---|---|---|
| Border radius | 24px | `rounded-3xl` |
| Padding | 18px (all sides) | `p-[18px]` |
| Background | `#FFFFFF` | `bg-white` |
| Border (default) | `1px solid rgba(85,65,139,0.08)` | inline |
| Border (pinned) | `1px solid violet-500` | `border-violet-500` |
| Shadow (default) | `0 1px 0 rgba(85,65,139,0.04), 0 12px 28px -18px rgba(85,65,139,0.25)` | inline / add to `tailwind.config.ts` as `shadow-card-soft` |
| Shadow (pinned) | adds `0 0 0 2px rgba(85,65,139,0.18), 0 18px 40px -22px rgba(85,65,139,0.45)` | as above, `shadow-card-pinned` |
| Hover | `translateY(-2px)`, transition 200ms ease | `hover:-translate-y-0.5 transition` |

## Internal Vertical Rhythm

| Section | Spacing | Notes |
|---|---|---|
| Header (badges + pin) | bottom margin 12px | `mb-3` |
| Faculty label | bottom margin 2px | `mb-0.5` |
| Program name | min-height 38px, line-height tight | grid alignment |
| Score band | top margin 12px | `mt-3` |
| Weights section | top margin 12px | `mt-3` |
| Footer (border-top + content) | top padding 12px, top margin 12px | `pt-3 mt-3` |
| Border-top of footer | 1px dashed `rgba(85,65,139,0.15)` | inline |

## Header (top row)

```
┌────────────────────────────────────────────────┐
│ [มข.] [● เปิด 2569]            (28×28 pin btn) │
└────────────────────────────────────────────────┘
```

| Element | Spec |
|---|---|
| Uni chip | `text-[11px] font-bold px-2 py-0.5 rounded-md bg-grape-soft text-grape-deep` |
| Status badge (active) | `text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700`, prefix dot 6×6 `bg-emerald-600` |
| Status badge (inactive) | same shape; `bg-taupe-soft text-taupe-deep`; text "📁 ไม่เปิดปีนี้" |
| Pin button | 28×28 round; default `bg-white border [rgba(85,65,139,0.18)] text-ink-mute`; pinned `bg-violet-500 text-white border-violet-500`; icon `lucide:Pin` 14×14, `fill="currentColor"` when pinned |

## Identity Block

| Element | Spec |
|---|---|
| Faculty label | `thai text-[11.5px] font-medium text-soft-periwinkle` |
| Program name | `thai text-[16px] font-bold leading-tight text-grape-deep`; `min-height: 38px` to keep stats baselines aligned across cards in a row |

## Score Band

```
┌──────────────────────────────────────────────┐
│ สถิติคะแนน ปี 2568                     ╱╲╱╲╱ │
│                                              │
│   64.2          72.8          84.1           │
│   MIN           MEAN          MAX            │
└──────────────────────────────────────────────┘
```

| Property | Value |
|---|---|
| Container | `rounded-2xl p-3 bg-grape-soft` |
| Header label | `thai text-[10.5px] font-bold uppercase tracking-[0.04em] text-ink-mute` |
| Sparkline | 50×16 SVG, `text-violet-500` stroke; hidden if fewer than 3 data points |
| Stat grid | `grid grid-cols-3`, center-aligned |
| Stat value | `num text-[18px] font-bold leading-none`, color: min=`text-rose-600`, mean=`text-violet-500`, max=`text-emerald-600` |
| Stat label | `font-mono text-[10px] uppercase tracking-[0.08em] text-ink-mute mt-1` |

## Weights Section

```
วิชาที่ใช้ (4)
[████████|██████|████|████████] (stacked bar, 8px tall)
[คณิตศาสตร์ 30%] [ฟิสิกส์ 25%] [อังกฤษ 20%] +1
```

| Property | Value |
|---|---|
| Section label | `thai text-[10.5px] font-bold uppercase tracking-[0.04em] text-ink-mute mb-1.5` |
| Stacked bar | `flex h-2 rounded-full overflow-hidden bg-[#F2EEF6]` |
| Segments | cycle through `bg-violet-500 / bg-soft-periwinkle / bg-rosy-taupe / bg-accent-600 / bg-emerald-600 / bg-amber-500` |
| Segment width | `${weightPercent}%` inline style |
| Chip | `thai text-[10px] px-1.5 py-0.5 rounded bg-[#F5F2FA] text-ink-soft` |
| Chip number | `num font-semibold text-grape-deep` |
| Overflow | `thai text-[10px] text-ink-mute self-center` `+N` |

## Footer

```
┌─ - - - - - - - - - - - - - - - - - - - - - - ┐
│  ที่นั่ง 60   GPAX 2.75      [📊 คำนวณ →]    │
└────────────────────────────────────────────────┘
```

| Element | Spec |
|---|---|
| Border-top | `1px dashed rgba(85,65,139,0.15)` |
| Stats row | `flex items-center gap-3 thai text-[11px] text-ink-soft` |
| Stat label (small) | `text-ink-mute` |
| Stat value (big) | `num font-bold text-ink` |
| CTA button | `thai inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-3 py-1.5 rounded-lg bg-grape-deep text-white hover:bg-violet-500 transition` |
| CTA icons | `lucide:Calculator` 12×12 + `lucide:ArrowRight` 12×12, both strokeWidth 1.8 |

## Grid Container (around cards)

Use:
```tsx
<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
  {programs.map(p => <ProgramCard key={p.id} ... />)}
</div>
```

Gap: 16px. No enforced row height — cards size to content.

## Empty / Edge Cases

| Case | Behavior |
|---|---|
| `history === null` | Hide the entire score-band section (don't render an empty card). |
| `weights.length === 0` | Hide the entire weights section. |
| `seats === null` | Omit the "ที่นั่ง" stat in footer; keep "GPAX" if present. |
| `minGpax === null` | Omit the "GPAX" stat in footer. |
| `trend.length < 3` valid points | Hide the sparkline (component returns null automatically). |
| `status === "inactive"` | Show "📁 ไม่เปิดปีนี้" pill. Do NOT dim the card body — keep it readable. |

## Color Reference Map

If your `tailwind.config.ts` doesn't have these exact tokens yet, add them or substitute the closest:

| Design name | Hex | Tailwind utility |
|---|---|---|
| Pinned border / weight accent 1 | `#55418B` | `border-violet-500`, `bg-violet-500` |
| Heading / CTA bg | `#3F2F6B` | `text-grape-deep`, `bg-grape-deep` |
| Score band / chip bg | `#EDE8F7` | `bg-grape-soft` |
| Faculty label / weight accent 2 | `#7D80DA` | `text-soft-periwinkle`, `bg-soft-periwinkle` |
| Weight accent 3 | `#BBA0A0` | `bg-rosy-taupe` |
| Inactive badge bg | `#F0E5E5` | `bg-taupe-soft` |
| Inactive badge text | `#8E7373` | `text-taupe-deep` |
| Weight accent 4 (gold) | `#ECBE42` | `bg-accent-600` |
| Default text | `#2A2240` | `text-ink` |
| Secondary text | `#5B5176` | `text-ink-soft` |
| Tertiary text | `#8C84A6` | `text-ink-mute` |
| min stat (red) | `#E2585A` | `text-rose-600` (closest stock; or add `text-zone-risky`) |
| max stat (green) | `#2F9B6E` | `text-emerald-600` (closest; or add `text-zone-competitive`) |
| Active dot | `#10B981` | `bg-emerald-600` |
| Active badge bg | `#D1FAE5` | `bg-emerald-100` |
| Weight-bar trough | `#F2EEF6` | `bg-[#F2EEF6]` (or add `bg-grape-deeper-soft`) |
| Chip bg | `#F5F2FA` | `bg-[#F5F2FA]` (or add `bg-violet-25`) |

The last two are slightly off from existing tokens — consider adding `violet-25` / `violet-50` extensions in the preset to avoid arbitrary values.
