# Pee Rahat — UI Specification (from Figma)

> Use alongside `design-system.md` — this file defines **layout, content, and structure** of each page.
> Colors, typography, and spacing always reference `design-system.md`.

---

## Page 1: Landing Page

### Layout overview

```
┌─────────────────────────────────────────────────────────┐
│  [Logo]    [nav-1] [nav-2] [nav-3]        [CTA button]  │  ← Header (80px)
├─────────────────────────────────────────────────────────┤
│                                                          │
│                   [Hero Heading]                         │  ← Hero section
│                  [Hero Subheading]                       │     center aligned
│                                                          │
│        ┌──────┐    ┌──────┐    ┌──────┐                 │
│        │ icon │    │ icon │    │ icon │                  │  ← 3 Feature cards
│        │title │    │title │    │title │                  │     equal width
│        │ desc │    │ desc │    │ desc │                  │
│        └──────┘    └──────┘    └──────┘                 │
│                                                          │
│            [Primary CTA]  [Secondary CTA]                │  ← Bottom CTAs
│                                                          │
└─────────────────────────────────────────────────────────┘
   ✦ sparkles + cloud blobs scattered across background
```

### Container

- max-width: 1280px
- padding-x: 48px (desktop), 24px (mobile)
- background: page gradient per `design-system.md` section 9
- min-height: 100vh

### Header

- height: 80px
- display: flex, align-items center, justify-content space-between
- padding: 0 (within container)

**Left — Logo**
- text: `Pee Rahat`
- font: 600 weight, 24px
- color: `violet-700`

**Center — Nav links**
- gap: 32px between items
- 3 items (Thai labels, kept verbatim):
  1. `อะไรคือพี่รหัส?`
  2. `ฟีเจอร์`
  3. `พี่รหัสทำงานยังไง?`
- font: 500, 14px
- color: `neutral-700`
- hover: color `violet-500`

**Right — Header CTA button**
- text: `เริ่มต้นใช้งาน`
- variant: `primary` (Button component)
- size: `md` (height 36px)

### Hero section

- margin-top: 80px (from header)
- text-align: center
- max-width of text block: 720px, margin auto

**Heading**
- text: `ติวถูกจุด คุยถูกคอ สไตล์พี่รหัส`
- font: 600 weight, 36px (text-display)
- color: `violet-700`
- line-height: 1.3

**Subheading**
- margin-top: 16px
- 2 lines:
  - line 1: `เหนื่อยมั้ย กับการนั่งหาติวเตอร์ที่ถูกใจ?`
  - line 2: `ตามหาพี่รหัสที่คุยภาษาเดียวกัน ได้ที่นี่`
- font: 400, 16px
- color: `neutral-700`
- line-height: 1.6

### Feature cards section

- margin-top: 64px
- display: grid, 3 columns equal, gap 24px
- max-width: 900px, margin auto

**Each card (3 total)**
- bg: `white` (#FFFFFF)
- border: 0.5px solid `neutral-200`
- radius: `radius-lg` (14px)
- shadow: `shadow-card`
- padding: 28px 20px
- text-align: center
- display: flex column, gap 12px

**Card structure (top to bottom):**

1. **Icon container**
   - size: 48px × 48px
   - bg: `violet-500`
   - radius: `radius-full`
   - icon: lucide-react, size 24px, color `neutral-50`
   - margin: 0 auto

2. **Title**
   - font: 600, 16px
   - color: `violet-700`

3. **Description**
   - font: 400, 12px
   - color: `neutral-500`
   - line-height: 1.5

**Card content (3 total):**

| Card | Icon | Title | Description |
|---|---|---|---|
| 1 | `Search` | `ค้นหา` | `เลือกวิชาที่ต้องการ และติวเตอร์ที่ถูกใจ` |
| 2 | `Calendar` | `จองเวลาเรียน` | `เลือกวันและเวลา ส่งคำขอ พี่รหัสยืนยันภายใน 24 ชม.` |
| 3 | `ShieldCheck` | `ชำระเงิน` | `ชำระผ่าน PromptPay QR สะดวก ปลอดภัย` |

### Bottom CTA section

- margin-top: 48px
- display: flex, gap 16px, justify-content center

**Button 1 (primary)**
- text: `เริ่มต้นใช้งาน`
- variant: `primary`
- size: `lg`

**Button 2 (secondary)**
- text: `อะไรคือพี่รหัส?`
- variant: `outline`
- size: `lg`

### Background decoration

- `<PageBackground />` component per `design-system.md` section 9
- absolute positioned behind content
- pointer-events: none
- z-index: -1

---

## Page 2: Login Page

### Layout overview

```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│          ┌────────────────────────────────┐              │
│          │                │                │              │
│          │                │   [Email]      │              │
│          │   [Mascot      │   [Password]   │              │
│          │    Image]      │   Forget pw?   │              │
│          │                │   [Login btn]  │              │
│          │                │   [G][F][A]    │              │
│          │                │  ─ no acct? ─  │              │
│          │                │   [Sign Up]    │              │
│          │                │                │              │
│          └────────────────────────────────┘              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Page container

- min-height: 100vh
- display: flex, align-items center, justify-content center
- padding: 48px (desktop), 16px (mobile)
- background: page gradient
- `<PageBackground />` decoration behind content

### Card

- max-width: 960px
- width: 100%
- bg: `white`
- radius: `radius-xl` (24px)
- shadow: `shadow-lg`
- overflow: hidden
- display: grid, grid-template-columns: 1fr 1fr
- min-height: 480px
- mobile: stack vertically (grid-template-columns: 1fr)

### Left side — Mascot

- padding: 40px
- display: flex, align-items center, justify-content center
- background: `white` (same as card)

**Image**
- `<Image src="/mascot.png" alt="Pee Rahat mascot" width={340} height={340} />`
- max-width: 100%
- object-fit: contain

### Right side — Form

- padding: 56px 48px (desktop), 32px 24px (mobile)
- display: flex column, justify-content center
- gap: 16px

**Form structure (top to bottom):**

1. **Email input**
   - Input component
   - placeholder: `Email`
   - type: email

2. **Password input**
   - Input component
   - placeholder: `Password`
   - type: password
   - margin-top: 12px

3. **Forget Password link**
   - text: `Forget Password?`
   - align: text-right
   - font: 400, 12px
   - color: `accent-700` (`#E9B21D`) ← yellow accent used here
   - hover: underline
   - margin-top: 4px
   - cursor: pointer

4. **Login button**
   - text: `Login`
   - variant: `primary`
   - fullWidth: true
   - size: `lg`
   - margin-top: 16px

5. **Social login row**
   - margin-top: 24px
   - display: flex, gap 16px, justify-content center
   - 3 buttons:

   **Social button**
   - size: 44px × 44px
   - radius: `radius-full`
   - bg: `white`
   - border: 1px solid `neutral-200`
   - hover: bg `neutral-100`
   - display: flex, align-items center, justify-content center
   - icon size: 20px

   Icons:
   - Google (multicolor logo)
   - Facebook (`#1877F2`)
   - Apple (`#000000`)

6. **Divider with text**
   - margin-top: 24px
   - display: flex, align-items center, gap 12px
   - 2 lines:
     - height: 1px
     - bg: `neutral-200`
     - flex: 1
   - center text: `Don't have an account?`
   - font: 400, 12px
   - color: `neutral-500`

7. **Sign Up button**
   - text: `Sign Up`
   - variant: `outline`
   - fullWidth: true
   - size: `lg`
   - margin-top: 16px

---

## Page 3: Sign Up Page

### Layout

Same as Login page 95% — reuse the same structure (Card + Mascot left + Form right).

**Differences in Form structure:**

1. **Username input**
   - placeholder: `Username`
   - type: text

2. **Email input**
   - placeholder: `Email`
   - type: email
   - margin-top: 12px

3. **Password input**
   - placeholder: `Password`
   - type: password
   - margin-top: 12px

4. **Terms checkbox row**
   - margin-top: 16px
   - display: flex, align-items center, gap 8px

   **Checkbox**
   - size: 16px × 16px
   - accent-color: `violet-500`

   **Label**
   - text: `I have agreed to Terms & Conditions`
   - font: 400, 12px
   - color: `neutral-700`
   - `Terms & Conditions` is a link: color `violet-600`, hover underline

5. **Create account button**
   - text: `Create an account`
   - variant: `primary`
   - fullWidth: true
   - size: `lg`
   - margin-top: 16px

**Does NOT include:**
- Forget Password link
- Social login row
- Divider
- Sign Up button (this IS the sign-up page)

**Optional (recommended):**
- link "Already have an account? Sign in" below Create account button
- font: 400, 12px, color `neutral-500`, the `Sign in` portion color `violet-600`

---

## Responsive Breakpoints

| Breakpoint | Width | Behavior |
|---|---|---|
| Mobile | <640px | Card stacks vertically · mascot ~50% height · form below |
| Tablet | 640–1024px | Card 50/50 with reduced padding · feature cards 2 columns |
| Desktop | ≥1024px | Full spec as above |

**Landing page feature cards:**
- desktop: 3 columns
- tablet: 2 columns + 1 below
- mobile: 1 column stacked

**Header on mobile:**
- nav links hidden behind hamburger menu
- logo left, hamburger right, CTA inside the menu

---

## Background Decoration Detail

`<PageBackground />` used on all 3 pages:

```tsx
<div className="fixed inset-0 -z-10 overflow-hidden">
  {/* Base gradient */}
  <div className="absolute inset-0 bg-gradient-to-br from-neutral-50 via-[#EDE8F0] to-[#DDD4E8]" />
  
  {/* Sparkles — 8-12 instances, varied position/size/opacity */}
  {/* sample of 4 */}
  <span className="absolute top-[10%] left-[8%] text-violet-200 text-xl opacity-50">✦</span>
  <span className="absolute top-[20%] right-[12%] text-violet-300 text-base opacity-60">✦</span>
  <span className="absolute bottom-[15%] left-[15%] text-violet-200 text-lg opacity-40">✦</span>
  <span className="absolute bottom-[25%] right-[20%] text-violet-300 text-xl opacity-50">✦</span>
  {/* ...add 4-8 more, scattered freely */}
  
  {/* Soft blobs */}
  <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-violet-100 opacity-40 blur-3xl" />
  <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-violet-200 opacity-30 blur-3xl" />
  <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-accent-100 opacity-20 blur-3xl" />
</div>
```

---

## Implementation Checklist (for Claude Code)

After migration, verify the following:

### Visual
- [ ] All colors come from tokens (no raw hex in component files)
- [ ] Font is Prompt across the entire system
- [ ] Thai headings use weight 600
- [ ] Spacing follows the scale (4/8/12/16/24/32...)
- [ ] Radius uses tokens only (md=8, lg=14, xl=24)

### Components
- [ ] Use `<Button>` component everywhere (no raw `<button>` with inline styles)
- [ ] Use `<Input>` component everywhere
- [ ] Mascot uses `<Image>` from `/public/mascot.png`

### Interaction
- [ ] Every button has a hover state (swap to accent-500)
- [ ] Every button has an active state (`scale(0.98)`)
- [ ] Every input has a focus state (violet-500 border + accent ring)
- [ ] Every link has a hover state (underline or color change)

### Accessibility
- [ ] Form inputs have `<label>` (visible or sr-only)
- [ ] Icon-only buttons have `aria-label`
- [ ] Focus visible everywhere (no `outline: none` without a replacement)
- [ ] Contrast passes AA on every text/bg pair

### Responsive
- [ ] Login/Sign Up card stacks vertically on mobile
- [ ] Landing feature cards adjust column count by breakpoint
- [ ] Header has a mobile menu
- [ ] Text scales down on mobile where needed

### Business logic (DO NOT TOUCH — verify still works)
- [ ] Auth API calls still go to the correct endpoints
- [ ] Form validation still works
- [ ] Routing (Login → success page) still correct
- [ ] Error messages still render
- [ ] Loading states still trigger
