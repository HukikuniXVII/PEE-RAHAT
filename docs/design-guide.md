# PeeRahat — Design Guide

> Reference for creating new UI designs while preserving all business logic.  
> Answer to: **"Which file do I edit to change the design of X?"**

---

## 1. Design System Tokens

All tokens live in **`packages/config/tailwind/preset.ts`**.  
Use these class names in every page/component.

### Colors

#### Primary Palette
| Token | Class | Hex | Use |
|-------|-------|-----|-----|
| `violet-500` | `text-violet-500` / `bg-violet-500` | `#55418B` | Primary CTAs, active states |
| `violet-400` | `text-violet-400` | `#664EA7` | Hover on primary |
| `violet-700` | `text-violet-700` | `#3B2D61` | Headings on light bg |
| `violet-800` | `text-violet-800` | `#2F244C` | Dark text on light bg |
| `accent-500` | `bg-accent-500` | `#F0CB67` | Hover on primary CTA, premium |
| `accent-700` | `text-accent-700` | `#E9B21D` | Links, highlights |

#### Neutrals
| Token | Class | Hex | Use |
|-------|-------|-----|-----|
| `neutral-50` | `bg-neutral-50` | `#F5F5F4` | Page backgrounds |
| `neutral-100` | `border-neutral-100` | `#EDEAE5` | Subtle borders |
| `neutral-200` | `border-neutral-200` | `#DFD9D8` | Input borders, dividers |
| `neutral-500` | `text-neutral-500` | `#6B656E` | Secondary body text |
| `neutral-800` | `text-neutral-800` | `#2E2A3D` | Primary body text |

#### Legacy Landing Palette (landing page + design work)
| Token | Class | Hex | Use |
|-------|-------|-----|-----|
| `dusty-grape` | `text-dusty-grape` | `#55418B` | Same as violet-500 |
| `grape-deep` | `text-grape-deep` | `#3F2F6B` | Landing headlines |
| `grape-soft` | `bg-grape-soft` | `#EDE8F7` | Soft purple tints |
| `soft-periwinkle` | `text-soft-periwinkle` | `#7D80DA` | Accents, sub-labels |
| `lavender-blush` | `bg-lavender-blush` | `#E5DBE6` | Section backgrounds |
| `rosy-taupe` | `text-rosy-taupe` | `#BBA0A0` | Decoration only (low contrast) |
| `white-smoke` | `text-white-smoke` | `#F5F5F4` | Text on dark backgrounds |
| `ink` | `text-ink` | `#2A2240` | Landing body text |
| `ink-soft` | `text-ink-soft` | `#5B5176` | Landing secondary text |
| `ink-mute` | `text-ink-mute` | `#8C84A6` | Landing muted/caption text |

### Typography
| Font | Class | Usage |
|------|-------|-------|
| Prompt / Sarabun | `font-sans` (default) | All Thai body text, UI text |
| Josefin Sans Bold | `font-josefin` | Logo, nav items, CTA buttons (landing only) |
| JetBrains Mono | `font-mono` | Code, version strings, monospace labels |

Add `.thai` class to any element with Thai text: `<p className="thai">ข้อความ</p>`

### Border Radius
| Token | Class | Value | Use |
|-------|-------|-------|-----|
| `md` | `rounded-md` | 8px | Inputs, small buttons |
| `lg` | `rounded-lg` | 14px | Cards |
| `xl` | `rounded-xl` | 24px | Large cards |
| `4xl` | `rounded-4xl` | 32px | Hero sections |

### Shadows
| Token | Class | Use |
|-------|-------|-----|
| `card` | `shadow-card` | Default card shadow |
| `lg` | `shadow-lg` | Elevated elements |
| `focus` | `shadow-focus` | Input/button focus ring (gold glow) |

---

## 2. Global CSS Utilities

Defined in **`apps/web/app/globals.css`**.

### Thai / Mono helpers
```
.thai     → Prompt + Sarabun font stack
.num      → tabular numerals (use on prices, stats)
.font-mono → JetBrains Mono
```

### Scrollbars
```
.no-scrollbar      → hide scrollbar (used on snap container)
.custom-scrollbar  → 6px styled scrollbar
```

### Landing Page Classes (use on landing page only)
```
.landing-page         → full-screen radial gradient background (#faf6f5 → #f2eef6 → #ece2e5)
.landing-chip         → purple pill chip
.landing-chip--taupe  → taupe variant chip
.landing-btn-grape    → filled purple CTA button
.landing-btn-soft     → white outline CTA button
.landing-nav-pill     → nav CTA pill
.landing-nav-link     → nav text link with hover
.landing-feature-card → glassy white feature card
.landing-feature-icon → 56px purple icon square
.landing-section-card → white glass section wrapper
.landing-hairline     → 1px purple-tinted border
.landing-sparkle      → decorative sparkle container
```

### Cloud Animations
```
cloud-drift-1 … cloud-drift-4  → slow organic float animations for background blobs
```

---

## 3. UI Component Library (`@peerahat/ui`)

Import from `@peerahat/ui`. Edit the source at `packages/ui/src/components/`.

### Button
**File:** `packages/ui/src/components/button.tsx`

```tsx
<Button variant="primary" size="brand-lg">CTA</Button>
```

| Variant | Appearance |
|---------|-----------|
| `primary` | Violet-500 bg → accent-500 on hover |
| `outline-brand` | Transparent + violet border |
| `ghost-brand` | Transparent, neutral text |

| Size | Height | Font |
|------|--------|------|
| `brand-sm` | 32px | 12px |
| `brand-md` | 36px | 13px |
| `brand-lg` | 44px | 14px |

### Input
**File:** `packages/ui/src/components/input.tsx`

```tsx
<Input placeholder="Email" invalid={hasError} />
```

- Height: 44px (`h-11`), `text-sm`
- Focus: violet-500 border + gold shadow ring
- Invalid: rose-600 border + rose shadow ring
- Override size: pass `className="h-[52px] text-base"`

### Card Suite
**File:** `packages/ui/src/components/card.tsx`

```tsx
<Card>
  <CardHeader><CardTitle>Title</CardTitle></CardHeader>
  <CardContent>…</CardContent>
</Card>
```

White bg, `rounded-lg`, neutral-200 border, `shadow-card`.

### Chip
**File:** `packages/ui/src/components/chip.tsx`

| Variant | Appearance |
|---------|-----------|
| `default` | violet-50 bg, violet-700 text |
| `brand` | violet-500 bg, white text |
| `accent` | accent-100 bg, neutral-800 text |
| `premium` | neutral-800 bg, accent-500 text |
| `ghost` | transparent, bordered |

### Dialog
**File:** `packages/ui/src/components/dialog.tsx`

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader><DialogTitle>…</DialogTitle></DialogHeader>
    …
  </DialogContent>
</Dialog>
```

Rounded-[32px], backdrop blur, ESC to close, portal-based.

### AuthCard
**File:** `packages/ui/src/components/auth-card.tsx`

- Grid: 54.5% mascot left / 45.5% form right
- Size: `w-[81vw] h-[79vh]`
- Mascot: `p-5`, rounded-2xl inner frame with violet-50 tint
- **Edit this file to change login/signup page layout**

### FeatureCard
**File:** `packages/ui/src/components/feature-card.tsx`

Icon + title + description. Violet-500 icon circle, white card bg, neutral-200 border.

### PageBackground
**File:** `packages/ui/src/components/page-background.tsx`

Full-screen fixed backdrop used on `/login` and `/signup`:
- Gradient: neutral-50 → #EDE8F0 → #DDD4E8
- `/background.jpg` overlay at 35% opacity
- Scattered ✦ sparkles + soft blur blobs
- **Edit this file to change auth page background**

### SocialLoginButton
**File:** `packages/ui/src/components/social-login-button.tsx`

44px circular icon button. Used for Google / Facebook / Apple login.

---

## 4. Per-Page Design File Guide

### Category A — Safe to completely rewrite ✅

These pages contain zero business logic. You can delete and rewrite the entire file.

| Page | File to Edit |
|------|-------------|
| Contact | `apps/web/app/contact/page.tsx` |
| Help / FAQ | `apps/web/app/help/page.tsx` |
| Privacy Policy | `apps/web/app/legal/privacy/page.tsx` |
| Terms of Service | `apps/web/app/legal/terms/page.tsx` |
| Offline fallback | `apps/web/app/offline/page.tsx` |

---

### Category B — Edit `page.tsx` wrapper, leave `_components/` alone ✏️

Edit the `page.tsx` for the heading/layout. Never touch `_components/` files — they own all the data fetching and mutations.

| Page | Edit this | Leave untouched |
|------|-----------|----------------|
| `/tutors` | `app/tutors/page.tsx` | `_components/tutor-search.tsx`, `_components/filter-sidebar.tsx` |
| `/sheets` | `app/sheets/page.tsx` | `_components/sheet-grid.tsx` |
| `/bookings` | `app/bookings/page.tsx` | `_components/schedule-view.tsx`, `_components/bookings-list.tsx` |
| `/chat` | `app/chat/page.tsx` | `_components/threads-list.tsx` |
| `/community` | `app/community/page.tsx` | `_components/community-feed.tsx`, `_components/post-*.tsx` |

For any of these, the `page.tsx` typically just contains:
- A page heading / hero section
- A call to the initial data-fetch
- Render of the `_components/` client component

---

### Category C — Restyle via shared components only 🎨

These pages have all logic in `_components/`. Do **not** rewrite the page file or the components.  
Instead, improve their look by editing the shared `Button`, `Input`, `Card` tokens in `@peerahat/ui`.

| Page | Approach |
|------|---------|
| `/tutors/[id]` | Edit `button.tsx`, `card.tsx` in `@peerahat/ui` |
| `/tcas` | Edit `button.tsx`, `input.tsx` in `@peerahat/ui` |
| `/chat/[id]` | Edit `button.tsx` in `@peerahat/ui` |
| `/sheets/[id]` | Edit `button.tsx`, `card.tsx` in `@peerahat/ui` |
| All admin pages | Edit `button.tsx`, `card.tsx`, `input.tsx` in `@peerahat/ui` |

---

### Category D — Landing page sections 🏠

Each section is its own component. Edit freely — they contain no business logic.

| Section | File |
|---------|------|
| Nav bar | `apps/web/components/landing/Nav.tsx` |
| Hero | `apps/web/components/landing/Hero.tsx` |
| About + Features | `apps/web/components/landing/AboutFeatures.tsx` |
| How It Works | `apps/web/components/landing/HowItWorks.tsx` |
| Snap scroll lock | `apps/web/components/snap-lock.tsx` (keep, don't edit) |

---

### Category E — Auth pages (login / signup) 🔑

Split between layout files (safe) and form files (do not touch):

| What to change | File |
|----------------|------|
| Card layout, proportions, mascot size | `packages/ui/src/components/auth-card.tsx` |
| Background gradient, sparkles, blobs | `packages/ui/src/components/page-background.tsx` |
| Login text sizes, input sizes, button styles | `apps/web/app/login/_components/login-form.tsx` *(style only — keep auth logic)* |
| Signup text sizes, input sizes, button styles | `apps/web/app/signup/_components/signup-form.tsx` *(style only — keep auth logic)* |

---

## 5. Global Design Files (affect every page)

Edit these to change the look of the entire app at once.

| File | What it controls | Impact |
|------|-----------------|--------|
| `packages/config/tailwind/preset.ts` | All color tokens, fonts, radius, shadows | 🌍 Global |
| `apps/web/app/globals.css` | Base styles, `.landing-*` utilities, cloud animations | 🌍 Global |
| `packages/ui/src/components/button.tsx` | Every button on every page | 🌍 Global |
| `packages/ui/src/components/input.tsx` | Every form input | 🌍 Global |
| `packages/ui/src/components/card.tsx` | All card containers | 🌍 Global |
| `apps/web/components/site-nav.tsx` | Navigation bar on all app pages | App pages |
| `apps/web/components/site-footer.tsx` | Footer on all app pages | App pages |
| `apps/web/components/main-wrapper.tsx` | Page container max-width/padding | App pages |
| `apps/web/app/layout.tsx` | Font loading, root providers, body class | 🌍 Global |

---

## 6. Quick Reference — "I want to change X"

| I want to change… | Edit this file |
|-------------------|---------------|
| Primary purple color | `packages/config/tailwind/preset.ts` → `violet.500` |
| Font for Thai body text | `globals.css` → `@layer base` font-family |
| Font for logo / nav | `globals.css` → add font import; `preset.ts` → `josefin` |
| All button styles | `packages/ui/src/components/button.tsx` |
| All input styles | `packages/ui/src/components/input.tsx` |
| Login/signup card size | `packages/ui/src/components/auth-card.tsx` |
| Login/signup background | `packages/ui/src/components/page-background.tsx` |
| Landing hero | `apps/web/components/landing/Hero.tsx` |
| Landing nav | `apps/web/components/landing/Nav.tsx` |
| App navigation bar | `apps/web/components/site-nav.tsx` |
| Tutors page heading | `apps/web/app/tutors/page.tsx` |
| Help/FAQ layout | `apps/web/app/help/page.tsx` |
| Legal pages | `apps/web/app/legal/*/page.tsx` |
