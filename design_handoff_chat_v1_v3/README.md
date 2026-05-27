# Handoff: Chat V1 (Desktop) + V3 (Mobile)

## Overview

Two complementary surfaces for the Pee Rahat in-app chat between student and tutor:

1. **V1 · Desktop Split** — 2-column layout (thread list left + active conversation right). Lives at `/chat` or `/chat/[id]` on desktop.
2. **V3 · Mobile iOS** — Single-column phone view of the same conversation. Lives at the same route on mobile breakpoint (or as a separate native screen).

They share data (threads, messages, booking proposals, bypass-redacted text) and only differ in layout.

---

## About the Design Files

The files in this bundle are **design references** — HTML/React prototypes showing intended look and behavior, **not production code to copy verbatim**.

Recreate this in the Pee Rahat web codebase (`apps/web/`, Next.js 14 App Router + Tailwind + `@peerahat/ui` + `@peerahat/types`):

- Use Tailwind tokens from `packages/config/tailwind/preset.ts` (violet-500, grape-deep, grape-soft, emerald-600, accent-500, ink, ink-soft, ink-mute, soft-periwinkle, rosy-taupe, taupe-deep, taupe-soft)
- Use existing `@peerahat/ui` primitives where they fit (`Card`, `Button`, `Input`, `Avatar`)
- `lucide-react` for icons
- Existing types from `packages/types/src/chat.ts`, `booking.ts`, `postpone.ts` apply

---

## Fidelity

**High-fidelity.** Match colors, spacing, typography, and bubble shapes exactly.

---

## File Map

```
design_handoff_chat_v1_v3/
├── README.md
├── ChatPage.tsx          # V1 desktop starter
├── MobileChat.tsx        # V3 mobile starter
├── spec.md               # measurements / colors / typography
└── reference/
    ├── Chat.html
    ├── community-shared.jsx       # palette, icons, Avatar
    ├── chat-shared.jsx            # threads + messages + BookingBadge
    ├── chat-v1-split.jsx          # V1 implementation
    └── chat-v3-mobile.jsx         # V3 implementation (uses ios-frame.jsx)
```

---

## Shared concepts

### Message kinds

Render switching by `m.kind`:

| kind | renders as |
|---|---|
| `divider` | day separator chip ("วันนี้", "วานนี้") |
| `them` | left-aligned message with 28px avatar; white bubble + 1px hairline border, rounded-2xl with sharp bottom-left corner |
| `me` | right-aligned violet-500 bubble with white text, rounded-2xl with sharp bottom-right corner |
| `system` | centered pill card (success=emerald, info=violet, warn=accent yellow); 18px icon + bold label + optional sub-text |
| `system-booking-proposal` | centered structured card (see "Booking proposal" below) |

Each `me`/`them` bubble also shows time + read state (`อ่านแล้ว ✓✓` / `ส่งแล้ว`) below in 10px ink-mute.

`m.body2redacted` adds an inline `[เบอร์/ID ถูกซ่อนตามนโยบายแชท]` pill (taupe-soft with dashed taupe border), 11px mono.

### Booking proposal card

Centered card (~440px V1, full-width V3), inline in the message stream. Sections:

1. **Header**: small calendar icon tile + "เสนอเวลาเรียน" label + author + "● รอตอบรับ" pill on the right.
2. **Date/time block** in `grape-soft` rounded surface — date 14px bold + "19:00 – 21:00 · 120 นาที" subtitle.
3. **Subject line** "📚 TPAT1 critical-thinking + จริยธรรมแพทย์".
4. **Note paragraph** (small ink-soft).
5. **Actions**:
   - V1: `เสนอเวลาอื่น` (outline) + `ปฏิเสธ` (taupe text) + spacer + `ตอบรับ` (filled violet)
   - V3: 3-column grid: `เสนอเวลาอื่น` | `ปฏิเสธ` | `ตอบรับ`

**No payment amount is shown on the card** — the user accepts a time only; payment flows elsewhere.

### Bypass filter

Inline replacement happens at render time. Server stores the redacted body; do not show original.

### Booking status badge (`BookingBadge`)

- `paid`     → "● จองแล้ว" emerald
- `proposed` → "● รอตอบ" accent yellow
- `done`     → "● เสร็จแล้ว" grape soft

Used in the thread list (V1) and could be used on Mobile thread previews.

---

## V1 · Desktop Split

### Layout
- Full viewport height, flex column
- **Top bar**: 48px, only Pee Rahat logo + name + "แชท" pill on left, avatar on right. **No app-level nav** here — the host shell already provides one.
- **Body**: 2-column grid `340px 1fr`, no right rail.

### Left rail (340px)
- Header section: title "ข้อความ" + new-chat button (violet square), then search input (rounded-full grape-soft), then 3 filter chips (ทั้งหมด / จองแล้ว / ยังไม่อ่าน) with counts.
- Thread list (scroll). Each row:
  - 42px avatar with green online dot
  - Right-aligned time (violet if unread)
  - Counterparty name 13.5px bold, university line 10.5px periwinkle (or taupe-deep for admin)
  - Last-message preview 12px (bold if unread) + unread pill at the end
  - Booking badge below if any
- Active thread: 3px violet left border + grape-soft bg.

### Center conversation
- **Sticky counterparty header**: 44px avatar with online dot, name 15px bold + verified, university line + "● ออนไลน์" emerald, then a single "เสนอเวลาเรียนใหม่" outline pill on the right.
  - **No "จองเรียนใหม่" button. No more (⋯) menu.**
- **No "Active booking strip"** below the header anymore.
- **Messages scroll area**: vertical message stream, 12px gap between items.
- **Composer**: 3 icon buttons (+ / image / smile) + rounded textarea + violet send button. Helper text under: "🔒 ทุกข้อความถูกเข้ารหัสและตรวจ bypass อัตโนมัติ".

### Bubble dimensions
- max-width: 70% of conversation column
- padding: 14px × 10px
- font-size: 13.5px / line-height 1.55
- corner radius: 18px / 18px / 4px / 18px (or mirrored for me)

### Data needs

```ts
import type { ChatThread, ChatMessage, BookingStatus, PostponeRequest } from "@peerahat/types";

// Existing `ChatThread.counterparty` covers most identity fields.
// Add a small derived view:
interface ThreadListItem {
  id: string;
  counterparty: { name: string; uni: string; verified: boolean };
  online: boolean;
  preview: string;     // last message redacted body
  time: string;        // humanized
  unread: number;
  booking?: BookingStatus | 'proposed' | 'done';
}
```

`ChatMessage` already exists. The booking-proposal "message" should be a synthesized client item built from an existing `PostponeRequest` (or future `BookingProposal`) entity attached to the thread — not stored as a `ChatMessage`.

---

## V3 · Mobile iOS

### Frame
- Wrap in an iPhone frame. Use the existing `<IOSDevice/>` starter (`ios-frame.jsx` in reference). For production, use any iPhone-shaped wrapper or render full-width on actual mobile breakpoints.

### Top bar (sticky in frame)
- Back arrow (chevron-left, violet-500) — links to `/chat` thread list
- 36px avatar with online dot
- Counterparty name + verified (14px bold) on line 1, "ออนไลน์ตอนนี้ · มหิดล แพทย์" on line 2 (10.5px, online state in emerald, rest in ink-mute)
- **No video icon, no phone icon, no more menu, no "เสนอเวลาเรียนใหม่" button** — clean header.

### Messages
- 24px small avatars (left of "them" bubbles), no avatar for "me"
- Bubble max-width 78%, font-size 13px
- Day chips ("วานนี้", "วันนี้")
- Booking proposal card uses 3-column button grid (เสนอเวลาอื่น | ปฏิเสธ | ตอบรับ)
- Centered system chips for ชำระเงิน success
- Typing indicator: 3 dots with staggered pulse animation

### Composer
- 36px circular `+` button (light bg, violet icon)
- Rounded-full input pill with smile suffix
- 36px circular violet send button
- Helper: "🔒 เบอร์/Line จะถูกซ่อนอัตโนมัติ" centered, 9.5px

---

## Design Tokens

| Token | Hex | Use |
|---|---|---|
| `violet-500` | `#55418B` | "Me" bubbles, primary CTA, send button, accent pills |
| `grape-deep` | `#3F2F6B` | Counterparty headers, dark text |
| `grape-soft` | `#EDE8F7` | Bubble surface tint, badges, thread search input bg |
| `soft-periwinkle` | `#7D80DA` | University text on thread rows |
| `rosy-taupe` | `#BBA0A0` | Reject/decline button text |
| `taupe-deep` | `#8E7373` | Admin label, reject hover |
| `taupe-soft` | `#F0E5E5` | Redacted pill bg |
| `accent-500/600` | `#F0CB67 / #ECBE42` | "รอตอบ" pill |
| `emerald-600` | `#2F9B6E` | Online dot, ✓ chips |
| `rose-600` | `#D9436E` | Unread notification badges |
| `ink` | `#2A2240` | Default text |
| `ink-soft` | `#5B5176` | Secondary text |
| `ink-mute` | `#8C84A6` | Microcopy, timestamps |

---

## Accessibility

- Bubbles: each has a `role="article"`; date dividers get `role="separator"`.
- Read receipts: prefix with screen-reader-only text "ข้อความถูกอ่านแล้ว".
- Online dot: hide from a11y tree (decorative) and put "ออนไลน์" in the visible label.
- Booking proposal card: focus order is `เสนอเวลาอื่น → ปฏิเสธ → ตอบรับ`. The primary (accept) gets `data-default` so Enter triggers it.
- Bypass-redacted pill: `aria-label="เนื้อหานี้ถูกซ่อนโดยระบบ"`, and explanation in a tooltip.
- Composer textarea: `aria-label="พิมพ์ข้อความ"`, supports Shift+Enter for newline, Enter to send.

---

## Open Questions

1. **Real-time?** The current API is polling; the prototype assumes a 5s React Query refetch. WebSocket upgrade later.
2. **Mobile breakpoint** — render V3 layout below `sm` (640px), or treat as a separate route?
3. **Empty thread list state** — copy/visual TBD.
4. **Day divider boundaries** — derive from local time of message `createdAt`. Confirm timezone handling (assume Asia/Bangkok).
5. **Booking proposal accept** — when the user taps "ตอบรับ", does that immediately confirm the time, or open the payment-intent flow on the next screen? The card itself shows no money, so my reading is: tap → navigate to `/bookings/[id]/pay`.
