# Pee Rahat — Design System

> Single source of truth for all UI work in this codebase.
> When this document conflicts with reference images or memory, **this document wins.**

---

## Brand

**Name:** Pee Rahat (พี่รหัส)
**Concept:** ติวเตอร์ออนไลน์สำหรับ นร.ม.ปลาย จับคู่กับพี่รหัส (รุ่นพี่มหา'ลัย)
**Tone:** อบอุ่น เชื่อใจได้ ทันสมัย ไม่ดูเป็นสถาบันกวดวิชาเก่า

---

## 1. Color Tokens

**Strict rule:** ใช้เฉพาะสีในตารางนี้ ห้ามใช้ hex สดในโค้ดเด็ดขาด ถ้าต้องการเฉดที่ไม่มี → เพิ่ม token ใน config ก่อน

### Violet — Primary brand
| Token | Hex | Use |
|---|---|---|
| `violet-50` | `#C6BFD9` | sparkle decoration, soft chip bg |
| `violet-100` | `#ADA1CE` | hover state on dark surfaces |
| `violet-200` | `#8E7BC1` | inactive states, subtle border |
| `violet-400` | `#664EA7` | secondary CTA on dark |
| `violet-500` | `#55418B` | **primary brand · default CTA on light** |
| `violet-600` | `#483776` | hover state |
| `violet-700` | `#3B2D61` | active/pressed, link visited |
| `violet-800` | `#2F244C` | deep emphasis text on light |

### Accent — Butter yellow
| Token | Hex | Use |
|---|---|---|
| `accent-50` | `#F2EAD5` | highlight bg (very subtle) |
| `accent-100` | `#F0E0B3` | chip bg, badge bg, text highlight |
| `accent-500` | `#F0CB67` | **primary CTA on violet/dark surfaces** |
| `accent-600` | `#ECBE42` | hover state |
| `accent-700` | `#E9B21D` | active state, secondary link text |
| `accent-800` | `#B68A12` | text on accent-50 |

### Neutral — Structure + text
| Token | Hex | Use |
|---|---|---|
| `neutral-50` | `#F5F5F4` | **page background (warm off-white)** |
| `neutral-100` | `#EDEAE5` | subtle bg, hover ghost |
| `neutral-200` | `#DFD9D8` | **default border** |
| `neutral-300` | `#C5BFC0` | divider |
| `neutral-400` | `#9A9499` | disabled text, icon muted |
| `neutral-500` | `#6B656E` | **muted text, placeholder, caption** |
| `neutral-700` | `#4D4750` | secondary body text |
| `neutral-800` | `#2E2A3D` | **primary body text, dark surface** |

---

## 2. Semantic Tokens

Use these in components instead of raw color tokens whenever possible:

| Semantic | Maps to |
|---|---|
| `--color-bg` | `neutral-50` |
| `--color-bg-subtle` | `neutral-100` |
| `--color-bg-inverse` | `neutral-800` |
| `--color-text` | `neutral-800` |
| `--color-text-muted` | `neutral-500` |
| `--color-text-inverse` | `neutral-50` |
| `--color-border` | `neutral-200` |
| `--color-border-strong` | `neutral-300` |
| `--color-brand` | `violet-500` |
| `--color-brand-hover` | `violet-600` |
| `--color-brand-active` | `violet-700` |
| `--color-brand-subtle` | `violet-50` |
| `--color-accent` | `accent-500` |
| `--color-accent-hover` | `accent-600` |
| `--color-accent-subtle` | `accent-100` |
| `--color-focus-ring` | `accent-500/40%` |

---

## 3. CTA Color Rule

**Primary CTA on every surface = `violet-500` solid, text `neutral-50`**

Brand consistency wins. Violet is the brand color and it has enough contrast on `neutral-50` (7.65 AAA) to be the universal primary CTA.

**Yellow accent (`accent-500`) is used for HOVER state on primary buttons** — not as a separate CTA color.

| State | Color |
|---|---|
| Default | `bg-violet-500`, text `neutral-50` |
| Hover | `bg-accent-500`, text `neutral-800` |
| Active/Pressed | `bg-violet-700`, text `neutral-50`, `scale(0.98)` |
| Focus | default + `shadow-focus` (accent ring) |
| Disabled | `bg-neutral-200`, text `neutral-400` |

**Why hover swaps to yellow instead of darker violet:**
- Stronger visual feedback (color change > brightness change)
- Yellow stands out without dominating layout (only appears on intentional interaction)
- Reuses the accent token meaningfully — keeps palette working as a system

**Yellow accent rules:**
- ✅ Hover state on primary buttons
- ✅ Streak/badge/premium indicators (inside the app)
- ✅ Focus ring at 40% opacity
- ❌ Default button color
- ❌ Text on `neutral-50` (contrast 1.43 — fails AA)
- ❌ Anywhere as standalone primary CTA

---

## 4. Typography

```css
font-family: 'Prompt', 'Sarabun', sans-serif;  /* Thai-friendly */
```

| Token | Weight | Size | Line | Use |
|---|---|---|---|---|
| `text-display` | 600 | 36px | 1.3 | hero heading |
| `text-h1` | 600 | 28px | 1.4 | page title |
| `text-h2` | 600 | 20px | 1.4 | section/card title |
| `text-h3` | 600 | 16px | 1.4 | small heading |
| `text-body` | 400 | 14px | 1.6 | body text |
| `text-body-lg` | 400 | 16px | 1.6 | hero subtext |
| `text-button` | 500 | 14px | 1 | button label |
| `text-caption` | 400 | 12px | 1.4 | helper, link |
| `text-small` | 400 | 11px | 1.4 | timestamps, tiny labels |

**Thai typography rules:**
- Use weight 500-600 for headings (Thai script needs more weight than Latin to read well)
- Line-height ≥ 1.5 for body (Thai diacritics need vertical space)
- Never use thin weights (100-300) for Thai

---

## 5. Spacing

4px base scale:

| Token | Value | Common use |
|---|---|---|
| `space-1` | `4px` | tight icon gap |
| `space-2` | `8px` | inline gap |
| `space-3` | `12px` | small padding |
| `space-4` | `16px` | **default gap (form fields, card padding)** |
| `space-5` | `20px` | medium gap |
| `space-6` | `24px` | section padding, card gap |
| `space-8` | `32px` | section gap |
| `space-10` | `40px` | large section gap |
| `space-12` | `48px` | hero padding |
| `space-16` | `64px` | hero section spacing |

---

## 6. Radius

| Token | Value | Use |
|---|---|---|
| `radius-sm` | `6px` | small chip |
| `radius-md` | `8px` | **button, input** |
| `radius-lg` | `14px` | **card** |
| `radius-xl` | `24px` | **large card, hero container** |
| `radius-full` | `9999px` | chip, avatar, social icon button |

---

## 7. Shadows

| Token | Value | Use |
|---|---|---|
| `shadow-sm` | `0 1px 3px rgba(46,42,61,0.06)` | subtle lift |
| `shadow-card` | `0 1px 3px rgba(46,42,61,0.06), 0 4px 12px rgba(46,42,61,0.04)` | **default card** |
| `shadow-lg` | `0 8px 32px rgba(46,42,61,0.08)` | hero card, modal |
| `shadow-focus` | `0 0 0 3px rgba(240,203,103,0.4)` | **focus ring (accent at 40%)** |

---

## 8. Components

### Button

**Sizes:**
- `sm`: height 32px, padding 0 12px, text 12px
- `md`: height 36px, padding 0 16px, text 13px
- `lg`: height 44px, padding 0 24px, text 14px **(default)**

**Variants:**

```
PRIMARY (default — works on all surfaces)
  bg: violet-500
  text: neutral-50
  hover: bg accent-500, text neutral-800
  active: bg violet-700, transform scale(0.98)
  focus: + shadow-focus
  disabled: bg neutral-200, text neutral-400, cursor not-allowed

OUTLINE
  bg: transparent
  border: 1.5px solid violet-500
  text: violet-700
  hover: bg violet-50
  active: bg violet-100
  
GHOST
  bg: transparent
  text: neutral-700
  hover: bg neutral-100

LOADING
  opacity 0.75
  add spinner: 14px, border 2px, border-top transparent, animate-spin
  cursor: wait
```

### Input

```
height: 44px
padding: 0 16px
border: 1px solid neutral-200
radius: radius-md (8px)
font: 400 14px
text color: neutral-800
placeholder color: neutral-500

states:
  hover:    border neutral-400
  focus:    border 1.5px violet-500, + shadow-focus
  disabled: bg neutral-100, text neutral-400, cursor not-allowed
  error:    border 1.5px #DC2626, + ring 0 0 0 3px rgba(220,38,38,0.2)
```

### Card

```
bg: white (#FFFFFF)
border: 0.5px solid neutral-200
radius: radius-lg (14px)
shadow: shadow-card
padding: space-6 (24px)
```

### Feature Card (icon + text)

```
width: 220px (responsive)
padding: 24px 20px
text-align: center

icon container:
  size: 48px
  bg: violet-500
  radius: full
  color: neutral-50
  
title: text-h3 weight 600, color violet-700, margin-top 12px
description: text-caption, color neutral-500, margin-top 4px
```

### Chip / Badge

```
height: 24px
padding: 0 12px
radius: radius-full
font: 500 11px

variants:
  default:  bg violet-50, text violet-700
  accent:   bg accent-100, text neutral-800
  brand:    bg violet-500, text neutral-50
  premium:  bg neutral-800, text accent-500
  ghost:    bg transparent, border neutral-200, text neutral-500
```

### Social Login Button

```
size: 44px × 44px
radius: full
bg: white
border: 1px solid neutral-200

hover: bg neutral-100
icon size: 20px
```

---

## 9. Background Treatments

### Page background (auth + landing)

```css
background:
  linear-gradient(135deg, #F5F5F4 0%, #EDE8F0 40%, #DDD4E8 100%);
```

Plus decorative layers (all `position: absolute`, `pointer-events: none`):

1. **Sparkles:** 4-point star characters or SVG, color `violet-200` or `violet-300`, opacity 0.3–0.6, scattered (8–12 instances), varied sizes 8–20px
2. **Soft blobs:** large circles, `bg-violet-100` or `bg-violet-200`, opacity 0.3–0.5, blur 80–100px, positioned at corners, sizes 300–500px

### Dark surface (modal, premium card)

```
bg: neutral-800 (#2E2A3D)
text: neutral-50
muted text: neutral-400
accent decoration: accent-500
```

---

## 10. Accessibility

**Mandatory:**
- All text on background must meet WCAG AA (4.5:1 for normal text, 3:1 for large text 18px+)
- Interactive elements must have visible focus state (use `shadow-focus`)
- Form inputs must have associated `<label>` (visible or `sr-only`)
- Buttons must have descriptive text; icon-only buttons need `aria-label`
- Don't rely on color alone — use icons or text labels for status

**Pre-verified contrast pairs (safe to use):**
- `violet-500` on `neutral-50` → 7.65 ✓ AAA
- `neutral-800` on `neutral-50` → 12.71 ✓ AAA
- `accent-500` on `neutral-800` → 8.87 ✓ AAA
- `accent-500` on `violet-500` → 5.34 ✓ AA
- `neutral-500` on `neutral-50` → 5.19 ✓ AA (use for placeholders, captions)

**Forbidden pairs:**
- ❌ `accent-500` text on `neutral-50` (1.43)
- ❌ `violet-200` text on `neutral-50` (3.35 — large text only)
- ❌ Pure white (`#FFFFFF`) backgrounds — use `neutral-50` instead

---

## 11. Tailwind Config

Save as `tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        violet: {
          50: "#C6BFD9", 100: "#ADA1CE", 200: "#8E7BC1", 400: "#664EA7",
          500: "#55418B", 600: "#483776", 700: "#3B2D61", 800: "#2F244C",
        },
        accent: {
          50: "#F2EAD5", 100: "#F0E0B3", 500: "#F0CB67",
          600: "#ECBE42", 700: "#E9B21D", 800: "#B68A12",
        },
        neutral: {
          50: "#F5F5F4", 100: "#EDEAE5", 200: "#DFD9D8", 300: "#C5BFC0",
          400: "#9A9499", 500: "#6B656E", 700: "#4D4750", 800: "#2E2A3D",
        },
      },
      fontFamily: { sans: ["Prompt", "Sarabun", "sans-serif"] },
      borderRadius: { md: "8px", lg: "14px", xl: "24px" },
      boxShadow: {
        card: "0 1px 3px rgba(46,42,61,0.06), 0 4px 12px rgba(46,42,61,0.04)",
        lg: "0 8px 32px rgba(46,42,61,0.08)",
        focus: "0 0 0 3px rgba(240,203,103,0.4)",
      },
    },
  },
};
export default config;
```

---

## 12. File Structure (recommended)

```
app/
  layout.tsx              # font import, root layout
  page.tsx                # landing page
  login/page.tsx
  signup/page.tsx
  globals.css             # tailwind imports + body bg

components/
  ui/
    Button.tsx
    Input.tsx
    Card.tsx
    Chip.tsx
    PageBackground.tsx
  features/
    FeatureCard.tsx
    SocialLoginRow.tsx
    AuthCard.tsx
  layout/
    Header.tsx

public/
  mascot.png              # transparent PNG, 680×680
```

---

## 13. Rules for AI/LLM-generated code

When you (Claude, or another model) generate components for this codebase:

1. **No raw hex codes** in component files. Always use Tailwind classes referencing the config (`bg-violet-500`, not `bg-[#55418B]`)
2. **No `style={{}}` for colors** — use Tailwind classes only
3. **All buttons use the `<Button>` component** in `components/ui/Button.tsx`. Don't recreate.
4. **All inputs use the `<Input>` component.** Same rule.
5. **Reference images are layout guides, not color sources.** Always defer to this document for color/spacing.
6. **All interactive elements must have:** hover state, focus-visible state, disabled state (if applicable).
7. **All text content must be in Thai or English consistently** — don't mix mid-sentence unless it's a proper noun.
8. **Mascot is `/mascot.png`** — never re-describe or regenerate it. Just `<Image src="/mascot.png" alt="Pee Rahat mascot" />`.
9. **Self-audit before output:** verify (a) no raw hex, (b) all tokens used, (c) accessibility contrast OK, (d) responsive considered.

---

## 14. Anti-patterns (Don't do)

| ❌ Don't | ✅ Do |
|---|---|
| `<button style={{background:'#55418B'}}>` | `<Button variant="primary">` |
| `<div className="bg-[#F0CB67]">` | `<div className="bg-accent-500">` |
| Yellow text on white | Yellow bg with dark text, or violet text |
| Cyan/blue accents | Stick to violet/accent/neutral only |
| Pure `#FFFFFF` page bg | Use `bg-neutral-50` |
| Border `solid 2px violet` on all inputs | Subtle `border-neutral-200`, violet on focus only |
| Random radius values (`7px`, `13px`) | Use radius tokens only |
| Adding new colors without updating this doc | Update doc + config first, then use |
