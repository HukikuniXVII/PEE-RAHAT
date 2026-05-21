# Handoff: V1 Program Card

## Overview

This package documents the **Program Card** component used in the V1 "Compare Dock" variation of the TCAS Search page redesign.

The card displays one TCAS program (university + faculty + program) with:
- KKU/university short code + active/inactive status badge
- Faculty name + program name (Thai)
- Last-year score band (min / mean / max) with a tiny trend sparkline
- Subject-weight visualization (mini stacked bar + chip list)
- Footer with seat count, GPAX minimum, and a "คำนวณ" CTA
- A pin-toggle button (top-right) that adds the program to the bottom comparison dock

It is designed to live in a **3-column grid** on the TCAS Search page (`/tcas` route in the Pee Rahat web app) and to size to its content (no enforced row height).

---

## About the Design Files

The files in this bundle are **design references** — HTML/React prototypes showing intended look and behavior, **not production code to copy verbatim**.

The task is to **recreate this component in the Pee Rahat web codebase** (`apps/web/`, Next.js 14 App Router + Tailwind + `@peerahat/ui` + `@peerahat/types`), following the project's existing patterns:

- Use Tailwind classes that already exist in `packages/config/tailwind/preset.ts` (violet-500, grape-deep, grape-soft, rosy-taupe, accent-500, ink, ink-soft, ink-mute, etc.)
- Use the project's `Card` and `Button` components from `@peerahat/ui` where they fit; otherwise create a self-contained component
- Import icons from `lucide-react` (not the inline SVGs in the prototype)
- Use the `TcasProgram`, `ProgramWeight`, and `HistoricalScore` Zod schemas from `packages/types/src/tcas.ts`

A starter `ProgramCard.tsx` is included that follows these conventions — treat it as a draft, not a final.

---

## Fidelity

**High-fidelity.** The prototype is pixel-accurate for layout, colors, typography, and spacing within the brand palette. Colors map to the canonical Tailwind tokens already in the codebase. The developer should match the visual output exactly.

---

## File Map

```
design_handoff_v1_program_card/
├── README.md                       # this file
├── ProgramCard.tsx                 # starter component (draft to adapt)
├── ProgramCard.spec.md             # exact measurements, colors, typography
├── reference/
│   ├── TCAS Search.html            # the full prototype HTML host
│   ├── tcas-search-v1.jsx          # V1 page (card lives inline here)
│   └── tcas-search-shared.jsx      # palette + mock data + helpers
```

The card markup in the reference is in `tcas-search-v1.jsx`, inside the `SearchV1Pin` component, the `filtered.map(p => ...)` block.

---

## The Component

### Name
`ProgramCard`

### Purpose
Display one TCAS program in a search-results grid. Lets the user:
1. See the program's identity at a glance (uni / faculty / name)
2. See last year's score statistics (min / mean / max + sparkline)
3. See which subjects this program uses + their weights
4. Pin it into a comparison dock
5. Jump straight to the calculator with this program preselected

### Layout

A rounded card (`border-radius: 24px`) with `padding: 18px` and a soft drop shadow.

Internal vertical rhythm (top → bottom):
1. **Header row** — `flex justify-between` — left: badge group (uni chip + status pill); right: 28×28 circular pin button.
2. **Faculty label** — `text-[11.5px]` periwinkle.
3. **Program name** — `text-[16px] font-bold` grape-deep, 2-line min-height to keep all cards aligned.
4. **Score band** — light-violet (`grape-soft`) rounded block containing:
   - Top row: small label "สถิติคะแนน ปี ____" + a 50×16 sparkline (last 6 years).
   - 3-column stat grid: min (red) · mean (violet) · max (green) — each: `text-[18px] font-bold` value, tiny mono uppercase label.
5. **Subject weights**:
   - Tiny uppercase label "วิชาที่ใช้ (N)"
   - 8px-tall stacked horizontal bar segmented by weight %, color-cycling through `violet-500 → soft-periwinkle → rosy-taupe → accent-600 → green → amber`.
   - Up to 3 subject chips (`text-[10px]`) + "+N" overflow indicator.
6. **Footer** — dashed top border + `flex justify-between`:
   - Left: stats inline — "ที่นั่ง 60" and "GPAX 2.75".
   - Right: pill CTA "คำนวณ →" filled in `grape-deep`.

### Components / Subparts

| Part | Spec |
|---|---|
| Card surface | `rounded-[24px]` `bg-white` `p-[18px]` `border border-[rgba(85,65,139,0.08)]` `shadow-[0_1px_0_rgba(85,65,139,0.04),0_12px_28px_-18px_rgba(85,65,139,0.25)]` |
| Pinned state | Border becomes `border-violet-500`; box-shadow adds `0_0_0_2px_rgba(85,65,139,0.18)` ring |
| Hover | `transform: translateY(-2px)`, transition 0.2s ease |
| Uni chip | `text-[11px] font-bold` `bg-grape-soft text-grape-deep` `px-2 py-0.5 rounded-md` |
| Active badge | `text-[10px] font-medium` `bg-[oklch(...)/...]` `text-competitive` with a 6px green dot, "เปิด 2569" |
| Inactive badge | `text-[10px] font-medium` `bg-taupe-soft text-taupe-deep`, "📁 ไม่เปิดปีนี้" |
| Pin button | 28×28 circle. Unpinned: white bg, `text-ink-mute`, hairline border. Pinned: `bg-violet-500 text-white`. Icon: `lucide-react` Pin (filled when pinned). |
| Score band | `rounded-2xl bg-grape-soft p-3` |
| Stat values | Tabular numerals (`font-feature-settings: "tnum","lnum"`). Sizes 18px bold. |
| Weight bar | `h-2 rounded-full bg-[#F2EEF6]` with inner `div`s = each subject's weight %. |
| Weight chip | `text-[10px] thai bg-[#F5F2FA] text-ink-soft px-1.5 py-0.5 rounded` + bold % in `grape-deep` |
| Footer divider | `border-top: 1px dashed rgba(85,65,139,0.15)` `pt-3` |
| CTA | `bg-grape-deep text-white text-[11.5px] font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5` with right arrow |

### States & Interactions

| State | Behavior |
|---|---|
| Default | Card sits flat, hairline border. |
| Hover | Lifts 2px (`translateY(-2px)`), transition 0.25s ease. |
| Pinned | Violet ring + halo shadow. Pin icon fills. |
| Pin click | Toggle membership in the parent's `pinned: string[]` state. Cap at 3 — if already 3 and trying to add, do nothing (or show toast). |
| CTA click | Route to `/tcas?programId=<id>` (or equivalent — the existing calculator entrypoint). |

### Data Contract

```ts
// Compose existing schemas from packages/types/src/tcas.ts
import type {
  TcasProgram,
  ProgramWeight,
  HistoricalScore,
} from "@peerahat/types";

export interface ProgramCardProgram {
  // identity
  id: number;                  // TcasProgram.id
  uniShort: string;            // e.g. "มข." — derived from university (NOT a DB column;
                               //   compute in mapper: see "Mapper" section below)
  university: string;          // e.g. "มหาวิทยาลัยขอนแก่น"
  faculty: string;             // e.g. "วิศวกรรมศาสตร์"
  programName: string;         // e.g. "วิศวกรรมคอมพิวเตอร์"
  status: "active" | "inactive";  // ProgramStatus (already in DB)

  // numbers
  seats: number | null;        // TcasProgram.seats
  minGpax: number | null;      // TcasProgram.minGpax

  // weights — already on TcasProgram via the relation
  weights: Array<{
    examCode: string;          // ProgramWeight.examCode
    nameTh: string;            // resolved from TcasExam.nameTh via the join
    weightPercent: number;
  }>;

  // history — pick the latest HistoricalScore
  history: {
    year: number;
    min: number | null;
    mean: number | null;
    max: number | null;
  } | null;

  // trend — last 6 years of mean scores (or just min). Null entries OK for missing years.
  trend: (number | null)[];
}
```

### Mapper (server → card)

The DB shape doesn't match this 1:1. Write a thin mapper in the API:

```ts
// apps/api/src/tcas/program-card.mapper.ts
export function toProgramCard(p: TcasProgramWithRelations): ProgramCardProgram {
  const sorted = [...p.history].sort((a, b) => b.year - a.year);
  const latest = sorted[0] ?? null;
  return {
    id: p.id,
    uniShort: shortenUni(p.university),
    university: p.university,
    faculty: p.faculty,
    programName: p.programName,
    status: p.status === "active" ? "active" : "inactive",
    seats: p.seats,
    minGpax: p.minGpax ? Number(p.minGpax) : null,
    weights: p.weights.map(w => ({
      examCode: w.examCode,
      nameTh: w.exam.nameTh,
      weightPercent: Number(w.weightPercent),
    })),
    history: latest && {
      year: latest.year,
      min: latest.minScore ? Number(latest.minScore) : null,
      mean: latest.meanScore ? Number(latest.meanScore) : null,
      max: latest.maxScore ? Number(latest.maxScore) : null,
    },
    trend: sorted.slice(0, 6).reverse().map(h => h.meanScore ? Number(h.meanScore) : null),
  };
}

const UNI_SHORT: Record<string, string> = {
  "มหาวิทยาลัยขอนแก่น": "มข.",
  "จุฬาลงกรณ์มหาวิทยาลัย": "จุฬาฯ",
  "มหาวิทยาลัยมหิดล": "มหิดล",
  "มหาวิทยาลัยธรรมศาสตร์": "ธรรมศาสตร์",
  "มหาวิทยาลัยเกษตรศาสตร์": "มก.",
  // ... extend
};
function shortenUni(full: string) { return UNI_SHORT[full] ?? full; }
```

The shortener could live as a util in `packages/types` if reused.

---

## Where it Fits

This card is the unit cell of the V1 search results grid. The grid lives in the redesigned `/tcas` page (which currently uses the 716-line `tcas-calculator.tsx`).

Suggested integration:
1. Refactor `apps/web/app/tcas/page.tsx` to fetch active TCAS programs (`GET /tcas/programs?round=R3_ADMISSION&status=active&include=weights,history`).
2. Render a 3-column grid of `<ProgramCard>` for each.
3. Manage pinned IDs in a `useState<number[]>`.
4. Surface the comparison dock as a sticky bottom bar (separate component — out of scope for this handoff).

---

## Tokens Used

All values map to existing Tailwind tokens. Use the names — do not hardcode hex.

| Token | Hex | Use |
|---|---|---|
| `violet-500` | `#55418B` | Pinned border, weight-bar segments, CTA hover |
| `grape-deep` | `#3F2F6B` | Headings, CTA bg, chip text |
| `grape-soft` | `#EDE8F7` | Uni chip bg, score band bg |
| `soft-periwinkle` | `#7D80DA` | Faculty label color, secondary weight segment |
| `rosy-taupe` | `#BBA0A0` | Tertiary weight segment |
| `taupe-soft` | `#F0E5E5` | Inactive badge bg |
| `taupe-deep` | `#8E7373` | Inactive badge text |
| `accent-500` / `-600` | `#F0CB67` / `#ECBE42` | 4th weight segment, premium chip |
| `ink` | `#2A2240` | Default text |
| `ink-soft` | `#5B5176` | Secondary text |
| `ink-mute` | `#8C84A6` | Microcopy, labels |
| zone red | `#E2585A` | `min` stat color |
| zone green | `#2F9B6E` | `max` stat color, "active" status |

For the inline `rgba(85,65,139,0.X)` shadows/borders/etc., I'd recommend defining these as semantic shadow tokens in `tailwind.config.ts`:

```ts
boxShadow: {
  // existing
  card: "0 1px 3px rgba(46,42,61,0.06), 0 4px 12px rgba(46,42,61,0.04)",
  lg: "0 8px 32px rgba(46,42,61,0.08)",
  focus: "0 0 0 3px rgba(240,203,103,0.4)",
  // add
  "card-soft": "0 1px 0 rgba(85,65,139,0.04), 0 12px 28px -18px rgba(85,65,139,0.25)",
  "card-pinned": "0 0 0 2px rgba(85,65,139,0.18), 0 18px 40px -22px rgba(85,65,139,0.45)",
}
```

---

## Typography

| Element | Font | Size | Weight | Line-height | Notes |
|---|---|---|---|---|---|
| Program name | `IBM Plex Sans Thai` (`thai`) | 16px | 700 | tight | `min-height: 38px` for grid alignment |
| Faculty label | `IBM Plex Sans Thai` | 11.5px | 500 | normal | periwinkle |
| Score stat value | `Plus Jakarta Sans` (`num`) | 18px | 700 | none | tabular-num |
| Score stat label | `JetBrains Mono` (`font-mono`) | 10px | 400 | normal | uppercase 0.08em |
| Section label | `IBM Plex Sans Thai` | 10.5px | 700 | normal | uppercase 0.04em ink-mute |
| Stats footer | `IBM Plex Sans Thai` | 11px | 400 | normal | ink-soft |
| Numbers in footer | `Plus Jakarta Sans` | 11px | 700 | normal | tabular-num, ink |
| CTA | `IBM Plex Sans Thai` | 11.5px | 600 | normal | grape-deep bg, white |

The `thai` and `num` classes already exist in the project's globals (set up in the prototype the same way as in `apps/web/app/globals.css`).

---

## Icons

Replace the inline SVGs from the prototype with `lucide-react` equivalents:

| Prototype | Lucide |
|---|---|
| `TIco.Pin` / `TIco.PinFilled` | `Pin` (toggle `fill="currentColor"` when pinned) |
| `TIco.Arrow` | `ArrowRight` |
| `TIco.Calc` | `Calculator` |
| `TIco.Sparkle` | `Sparkles` |

All at size **14px** (`h-3.5 w-3.5`) unless otherwise noted.

---

## Accessibility

- The card itself is a `<article>`, not a button — only the pin and the CTA are interactive. The whole-card click goes to the calculator (treat the article as a link by adding `<Link>` wrapper, with the pin button using `e.stopPropagation()`).
- Pin button needs `aria-pressed={isPinned}` and a `title` ("ปักหมุดเปรียบเทียบ" / "ถอนปักหมุด").
- Score stats: each value cell should have `aria-label="คะแนนต่ำสุด 64.2"` etc.
- Status badges: just text, no special handling needed.
- All color combinations meet WCAG AA on white. The microcopy `ink-mute` on white is borderline — keep ≥11px for it.

---

## Responsive Behavior

- **Desktop (≥1024px)** — 3-column grid (target).
- **Tablet (640–1023px)** — 2-column grid. Card layout unchanged.
- **Mobile (<640px)** — 1-column grid. Card layout unchanged but score-band switches stat row to keep readability; consider hiding the sparkline below 360px.

`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`

---

## Reference Files

- `reference/tcas-search-v1.jsx` — the V1 page with the card markup inline (look for the `filtered.map(p => ...)` block in `SearchV1Pin`).
- `reference/tcas-search-shared.jsx` — palette + mock program data + the `Spark` and `BrandChip` helpers I used in the prototype. Useful to mirror the helpers (Spark especially) in the real codebase.
- `reference/TCAS Search.html` — host file to preview the whole flow (open in a browser).

---

## Open Questions

1. **Pin persistence** — should pinned IDs survive page refresh? Suggest `localStorage` keyed by `peerahat:tcas:pinned:v1`.
2. **Trend data availability** — the design assumes ≥4 years of `meanScore` history. With only 2 years (current DB state), the sparkline degenerates to a 2-point line. Either:
   - Hide the sparkline when `< 3` data points, or
   - Fall back to showing just the latest min/max delta as a `+1.2/ปี` text indicator.
3. **Round selector** — this card lives inside a tab (NETSAT | TCAS). Does the card need to render the round (R2_NETSAT vs R3_ADMISSION) anywhere? Currently no — the tab provides context.
4. **Empty weights** — programs with no `weights` rows: hide the weight-bar section entirely, don't render an empty skeleton.
