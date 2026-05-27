# Handoff: Community V2 + Mini-Profile Overlay

## Overview

This package documents three pieces of the Pee Rahat redesign:

1. **V2 Community Page** — Facebook-style cozy-card feed (simplified): left rail with Trending + Saved, wide center feed with composer + post cards.
2. **Mini-Profile Overlay (Student)** — Lightweight modal showing a student's stats when their avatar/name is clicked anywhere in the feed.
3. **Mini-Profile Overlay (Tutor)** — Rich modal showing a tutor's KYC stats, rate, reviews, students taught, and best-selling sheet.

The overlay opens on top of the feed page; both variants share the same shell but render different bodies.

---

## About the Design Files

The files in this bundle are **design references** — HTML/React prototypes showing intended look and behavior, **not production code to copy verbatim**.

The task is to **recreate this in the Pee Rahat web codebase** (`apps/web/`, Next.js 14 App Router + Tailwind + `@peerahat/ui` + `@peerahat/types`), following the project's existing patterns:

- Use Tailwind classes from `packages/config/tailwind/preset.ts` (violet-500, grape-deep, grape-soft, rosy-taupe, accent-500, ink, ink-soft, ink-mute, emerald, etc.)
- Use existing `@peerahat/ui` primitives (`Card`, `Button`, `Chip`, `Dialog`) where they fit; for the overlay surface use the existing `Dialog` family
- Import icons from `lucide-react` (not the inline SVGs in the prototype)
- Use the existing `CommunityPost`, `User`, `Tutor` types from `packages/types`

Starter `.tsx` files are included as drafts.

---

## Fidelity

**High-fidelity.** Colors, spacing, typography, and interactions are intentional. Developer should match the visual output exactly.

---

## File Map

```
design_handoff_v2_community_overlay/
├── README.md                              # this file
├── CommunityV2Page.tsx                    # page shell starter
├── ProfileOverlay.tsx                     # overlay modal starter (student + tutor)
├── spec.md                                # dimensions / colors / states
└── reference/
    ├── Community.html                     # full prototype host
    ├── community-shared.jsx               # palette, icons, mock data
    ├── community-v2-fb.jsx                # V2 page implementation
    └── community-v2-profile-overlay.jsx   # overlay implementation
```

---

## 1. V2 Community Page

### Layout
- **Max width**: 1200px, centered with 24px padding
- **2-column grid**: 260px (left rail, sticky top:24) + 1fr (feed)
- **Gap**: 20px
- **Background**: soft lavender gradient (`.cs-bg` in prototype) → use `<PageBackground photo={false} sparkles="sparse"/>` from `@peerahat/ui`

### Left Rail (260px, sticky)

Two stacked cards:

#### A. Trending Card (`กำลังมาแรง`)
- Header: 32px violet icon tile (TrendingUp) + title + "อัปเดตทุก 15 นาที" subtitle
- 5 trending rows. Each: category line (small grey) + `#tag` line bold (+ red fire icon on #1) + count line (mono small). Rank pill `#1`, `#2`, `#3` highlighted in `grape-soft`, the rest plain.
- Footer link `ดูเทรนด์ทั้งหมด →`

#### B. Saved Card (`ที่บันทึกไว้`)
- Header: 32px accent-yellow icon tile (Bookmark filled) + title + subtitle + count pill
- Up to 3 saved-post rows. Each: 28px avatar + author/tag (violet) + 2-line truncated post body + "บันทึกไว้ X ที่แล้ว"
- Empty state: `🔖 ยังไม่มีโพสต์ที่บันทึก`
- Footer link `ดูที่บันทึกทั้งหมด →`

### Center Feed
- `space-y-4`
- Order: Composer → Posts

#### Composer (`SimpleComposer`)
- Card with 40px avatar + textarea (`มีอะไรอยากถามรุ่นพี่?` placeholder, 2 rows, auto-resize)
- Bottom row: `รูปภาพ` button (emerald), `แท็ก` button (violet), spacer, `โพสต์` pill (violet, disabled until text)

#### Post Card (`FbPost`)
Sections, top to bottom:
1. **Author header** — 44px avatar (with `✓` badge dot if verified) + name + verified icon + uni badge + meta line (`when · 🌐 · #tag`) + more menu
2. **Body** — 14.5px Thai text, line-height 1.6, whitespace preserved, hashtags rendered as violet links
3. **Embed** (optional, if `p.embed`) — sheet or tutor card
4. **Poll** (optional, if `p.poll`) — option rows with progress bars
5. **Reaction summary** — emoji stack (❤ 🎉 💡) + total likes count + "X ความเห็น"
6. **Action row** — 3 columns: `ถูกใจ` (rose), `ความเห็น` (periwinkle), `บันทึก` (accent yellow). Icons fill when active.
7. **Inline comments** (optional, if topReplies length > 0) — light background, 32px reply avatars, comment bubbles with bold author + body, action row (ถูกใจ/ตอบกลับ + likes pill), inline comment composer at bottom

### Data Contract

```ts
// Reuse existing CommunityPost from packages/types, plus:
interface CommunityPostView extends CommunityPost {
  // existing
  author: {
    name: string;        // display name
    uni: string;         // university + faculty + year (for verified)
    verified: boolean;
    handle: string;
  };
  // additions for the V2 feed
  tag: string;           // e.g. "#ถามพี่หมอ"
  when: string;          // already a humanized string
  liked: boolean;
  bookmarked: boolean;
  reposts: number;
  views: number;
  bookmarks: number;
  embed?: {              // optional inline embed
    kind: 'sheet' | 'tutor';
    // ...kind-specific fields
  };
  poll?: {
    question: string;
    options: { label: string; votes: number }[];
    voted: number;
    total: number;
    endsIn: string;
  };
  topReplies: Reply[];
}

interface Reply {
  author: string;
  uni?: string;
  verified?: boolean;
  when: string;
  body: string;
  likes: number;
}
```

---

## 2. Mini-Profile Overlay

Opens when the user clicks on a poster's avatar/name anywhere in the feed (or in a comment). The overlay is **display-only — there are no action buttons** by design. Closing the overlay (X or backdrop click) returns to the feed.

### Shell (shared between student + tutor)

- **Backdrop**: full-screen `rgba(42,34,64,0.42)` + `backdrop-filter: blur(6px)`
- **Card**: centered, white, rounded-2xl, shadow-lg
- **Width**: 440px for student / 520px for tutor
- **Max height**: 90% of viewport, body scrolls if overflow
- **Header band**: 60px gradient (`taupe → violet` for student, `violet → taupe` for tutor) with absolute close × button top-right and decorative sparkle. No text label inside the band.
- **Avatar block**: 76px avatar overlapping the band (white 4px ring), name + verified + handle + role/year/goal subtitle next to it
- **Body**: stats grid + sections (see variant specs below)

### Student Body (~440px)
1. **3-stat strip** — โพสต์ / ความเห็น / ที่บันทึก
2. **Section: เป้าหมาย** — gradient soft card with icon + faculty/uni + secondary line
3. **Section: วิชาที่สนใจ** — chip cluster
4. **Section: โพสต์ล่าสุด** — 2-row mini list with tag chip + body + time
5. **Footer note** — `🌸 เข้าร่วมเมื่อ X เดือนก่อน · สุภาพ ไม่ละเมิดกฎ`

### Tutor Body (~520px)
1. **4-stat strip** — ★ rating (accent yellow) / ชั่วโมงสอน / นักเรียน / ตอบใน
2. **Ranking strip** — 🏆 อันดับ #X ในกลุ่ม #xxx
3. **Section: วิชาที่สอน** — chip cluster + rate row (`฿600 / ชั่วโมง`)
4. **Section: เกี่ยวกับพี่** — bio paragraph
5. **Section: รีวิวจากนักเรียน · 240 รีวิว** — 3 review cards (avatar + name + stars + time + body), footer "ดูทั้งหมด" link
6. **Section: นักเรียนที่สอนผ่านมา** — 5-avatar stack + "และอีก X คน · ส่วนใหญ่ติด..."
7. **Section: ชีทขายดีของพี่** — mini sheet card with thumbnail + title + rating + price
8. **Footer note** — `🛡️ ผ่าน KYC + ทรานสคริปต์ · เข้าร่วม X ปีก่อน`

### Interaction

- Should open with a small pop-in animation (250ms `cubic-bezier(.2,.7,.3,1)`, opacity 0→1 + translateY 4→0)
- Backdrop click OR `Esc` key closes
- X button closes
- No other clickable elements inside should fire app actions in this version — they're decorative
- Trap focus inside while open (use the existing `Dialog` primitive from `@peerahat/ui`)

### Data Contract

```ts
type ProfileMode = 'student' | 'tutor';

interface ProfileOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ProfileMode;
  subject: {
    name: string;
    handle: string;
    verified: boolean;
    avatarUrl?: string;
  };
  // student-only
  studentStats?: {
    posts: number;
    comments: number;
    bookmarks: number;
    goalFaculty: string;
    goalUni: string;
    goalSubLine: string;        // e.g. "เริ่มเตรียมตัวเมื่อ 6 เดือนก่อน · TPAT1 ~45"
    interestedSubjects: string[];
    recentPosts: { tag: string; body: string; when: string }[];
    joinedAgo: string;          // "6 เดือน"
  };
  // tutor-only
  tutorStats?: {
    uniLine: string;            // "มหิดล คณะแพทย์ ปี 4"
    rating: number;
    hoursTaught: number;
    studentsTaught: number;
    responseTime: string;       // "<1"
    weeklyRank?: { rank: number; tag: string };  // #2 in #ถามพี่หมอ
    subjectsTaught: string[];
    hourlyRate: number;
    bio: string;
    reviews: {
      name: string;
      when: string;
      stars: number;
      body: string;
    }[];
    totalReviews: number;
    pastStudentInitials: string[]; // top 5 for avatar stack
    otherStudentsCount: number;
    placedUniSummary: string;   // "แพทย์ มข./มหิดล/จุฬา"
    topSheet?: {
      title: string;
      rating: number;
      reviewCount: number;
      soldCount: number;
      price: number;
    };
    joinedYearsAgo: number;
  };
}
```

### Data source mapping

- `subject` comes from the post being viewed (`CommunityPost.author`).
- For the **student** body, fetch from `GET /users/:id/community-stats` (a new lightweight endpoint to add).
- For the **tutor** body, fetch from existing `GET /tutors/:id` + `GET /tutors/:id/reviews?limit=3` + `GET /tutors/:id/top-sheet`. These mostly exist in the API already; the only new field is `weeklyRank`.

---

## Design Tokens

All map to existing Tailwind tokens. Reference:

| Token | Hex | Use |
|---|---|---|
| `violet-500` | `#55418B` | Primary CTAs, headings accents, post tag links |
| `grape-deep` | `#3F2F6B` | Headings, dark text emphasis |
| `grape-soft` | `#EDE8F7` | Card subdued backgrounds, chip backgrounds |
| `soft-periwinkle` | `#7D80DA` | Comment bubble color, secondary accent |
| `rosy-taupe` | `#BBA0A0` | Decorative gradient stop |
| `accent-500/600` | `#F0CB67 / #ECBE42` | Saved badge, ★ rating color |
| `emerald-600` | `#2F9B6E` | "Online" dot, ✓ Verified states |
| `rose-600` | `#D9436E` | Heart icon, notification dot |
| `ink` | `#2A2240` | Default body text |
| `ink-soft` | `#5B5176` | Secondary text |
| `ink-mute` | `#8C84A6` | Microcopy, timestamps |

---

## Typography

| Element | Font | Size | Weight |
|---|---|---|---|
| Card headings | `IBM Plex Sans Thai` (`thai`) | 14px | 700 |
| Post body | `IBM Plex Sans Thai` | 14.5px | 400 |
| Post author name | `IBM Plex Sans Thai` | 14px | 700 |
| Meta / timestamp | `IBM Plex Sans Thai` | 11.5px | 400 |
| Stat values | `Plus Jakarta Sans` (`num`) | 15px | 700 |
| Stat labels | `IBM Plex Sans Thai` | 10px | 400 |
| Section labels (overlay) | `IBM Plex Sans Thai` | 10.5px | 700, uppercase, tracking-wider |
| Overlay name | `IBM Plex Sans Thai` | 18px | 700, -0.01em letter-spacing |

---

## Accessibility

- Overlay: use the existing `Dialog` from `@peerahat/ui` — handles focus trap, `Esc`, ARIA role, backdrop click
- Close button: `aria-label="ปิดโปรไฟล์"`
- Avatar opening the overlay: `<button>` with `aria-haspopup="dialog"` and `aria-label="ดูโปรไฟล์ของ <name>"`
- Stat values: each cell has an `aria-label` combining label + value
- Star rating: `aria-label="คะแนน 4.95 จาก 5"`
- The overlay is information-only — no actions should be reachable that aren't visually present

---

## Reference Files

- `reference/Community.html` — host (open in browser to preview)
- `reference/community-shared.jsx` — palette, icons, Avatar, UniBadge, mock POSTS / TRENDING
- `reference/community-v2-fb.jsx` — V2 page implementation
- `reference/community-v2-profile-overlay.jsx` — overlay implementation (both modes)

---

## Open Questions

1. **Who can open the overlay?** Anywhere there's an author name/avatar (post header, comment header). Confirm if you also want it on the Saved list and Trending mentions.
2. **Tutor "weekly rank"** — not currently in the DB. Add a computed endpoint or denormalize?
3. **Student "interested subjects"** — derive from posts tagged + diagnostic quiz history, or let the user set explicitly in profile?
4. **Tutor "top sheet"** — pick by sold count or by rating × reviews? Suggest sold count for "ขายดี" semantics.
