## Scope for THIS session
Build only:
1. Shared Nav (sticky, used across all landing sections)
2. Landing page Hero section (first of 3 full-viewport snap-scroll sections — Features and How-it-works come later)
3. Login page (single form with toggle to Sign Up, includes social login)

Do NOT build Features or How-it-works yet. Structure the landing page so adding them later is trivial.

## Figma source
- File link: https://www.figma.com/design/1ALD9OTt1JMEdEQMbvhWFE/Pee-Rahat?node-id=0-1&t=nwsieJQtIAUVHXGh-1
- Nav/header frame (or where to find it in Hero): https://www.figma.com/design/1ALD9OTt1JMEdEQMbvhWFE/Pee-Rahat?node-id=16-113&t=nwsieJQtIAUVHXGh-4
- Hero frame: https://www.figma.com/design/1ALD9OTt1JMEdEQMbvhWFE/Pee-Rahat?node-id=16-111&t=nwsieJQtIAUVHXGh-4
- Login frame: https://www.figma.com/design/1ALD9OTt1JMEdEQMbvhWFE/Pee-Rahat?node-id=24-116&t=nwsieJQtIAUVHXGh-4
- Signup frame: https://www.figma.com/design/1ALD9OTt1JMEdEQMbvhWFE/Pee-Rahat?node-id=36-34&t=nwsieJQtIAUVHXGh-4
- Design system / tokens frame: design-system.md

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- shadcn/ui for primitives (Button, Input, Label, etc.) — install as needed
- react-hook-form + zod for form validation
- Target viewport: 1920x1080 desktop only (no responsive work needed in this session)

## Page structure
- `/` → Landing page. Three full-viewport sections stacked vertically with CSS snap-scroll (`scroll-snap-type: y mandatory` on the container, `scroll-snap-align: start` on each section). Each section is `h-screen`. Only build Hero for now; leave clearly-marked placeholder sections for Features and HowItWorks (e.g. `<section className="h-screen snap-start" id="features">{/* TODO */}</section>`).
- `/login` → Login page. Single form that toggles between Login and Sign Up modes via a button/link inside the form (e.g. "Don't have an account? Sign up" / "Already have an account? Log in"). Not separate routes.

## Auth form requirements
- Login mode: email + password + social login buttons (Google, and whatever else is in the Figma — list them after inspecting)
- Sign Up mode: whatever fields are in the Figma signup frame + social login buttons + password validation
- Validation with zod schemas:
  - Email: valid email format
  - Password: minimum 8 chars (adjust if Figma indicates otherwise)
  - Show inline error messages under fields
- Submit handler: stub that `console.log`s the payload and shows a brief success state. No real auth backend.
- Social login buttons: stub click handlers that `console.log("Google login clicked")` etc.

## Nav requirements
- Sticky to top of viewport across all landing sections (z-index above content, semi-transparent background or whatever Figma specifies)
- Contains a CTA button that routes to `/login` using Next.js `<Link>`
- Should NOT appear on the `/login` page (unless Figma shows it there too — confirm)

## Workflow — follow this order

1. **Connect to Figma MCP first.** If not configured, stop and tell me how to set it up. Do nothing else until this works.

2. **Extract design tokens before writing components.** Call `get_variable_defs` on the file (or design system frame). Map to `tailwind.config.ts` under `theme.extend` — colors, fontFamily, fontSize, spacing, borderRadius, boxShadow. Use `next/font` for any Google Fonts (or flag paid fonts). Show me the config and pause for confirmation before continuing.

3. **Initialize shadcn/ui** and install only the primitives you need (button, input, label, form). Don't install components you won't use.

4. **Build bottom-up.** For each piece below, in order:
   a. Call `get_design_context` on the relevant Figma frame
   b. Call `get_screenshot` and save locally for reference
   c. Build the component
   d. Render and visually compare against the Figma screenshot
   e. List specific deltas (color/spacing/font-weight/etc.) and fix before moving on

   Build order:
   1. Nav (`components/landing/Nav.tsx`)
   2. Hero (`components/landing/Hero.tsx`) — including CTA wired to `/login`
   3. Landing page composition (`app/page.tsx`) with snap-scroll container + Hero + 2 placeholder sections
   4. LoginForm + SignupForm logic (`components/auth/AuthForm.tsx` — single component with mode toggle is fine)
   5. Login page (`app/login/page.tsx`)

5. **File layout:**
   - `components/ui/` → shadcn primitives
   - `components/landing/` → Nav, Hero
   - `components/auth/` → AuthForm and any auth-specific pieces
   - `lib/schemas.ts` → zod schemas for login + signup
   - `app/page.tsx`, `app/login/page.tsx`

6. **Icons & images:** List any raster assets you encounter with their Figma node names and ask me to export them. Don't hallucinate URLs or use placeholder image services. Inline SVG icons should be reproduced inline (or use lucide-react if shadcn-style icons match).

7. **Things to flag, not guess:**
   - Paid/non-Google fonts
   - Missing hover/focus/active/error/disabled states (build sensible defaults but flag them)
   - Whether Nav appears on /login
   - Exact social login providers shown in the Figma
   - Any ambiguous layering or hidden frames

## Verification standard
After each component: render in dev, screenshot the result, compare against Figma screenshot. Be skeptical of your own work — if something looks "close enough," that's not good enough. List specific pixel/color/spacing deltas, then fix them. Do not declare a component "done" until you've actually done this comparison.

## What I don't want
- Generic AI-aesthetic shortcuts ("modern gradient hero with subtle shadow")
- Inventing values not in the Figma
- Skipping token extraction to get to coding faster
- Building Features or How-it-works in this session
- Real backend auth — stubs only
- Responsive work — desktop 1920x1080 only
- Marking anything "done" without visual comparison

Start with step 1.