# Pee Rahat Codebase Guide for Claude

## Guidelines
- Frontend never contains business logic
- All DTOs live in /packages/types
- Use Thai for user-facing copy, English for code/comments
- Reference FR-IDs from requirements.md in every commit
- Phase 1 only — do not implement Phase 2 features

## Critical: Read first
Before writing any UI code, you MUST read `design-system.md` in this directory.
That document is the single source of truth for colors, typography, spacing, and component patterns.

## When the user asks for UI work:
1. Read `design-system.md` first
2. Check if existing components in `components/ui/` already solve the task
3. Use Tailwind classes referencing `tailwind.config.ts` — never raw hex
4. Verify accessibility (contrast, focus states) before output
5. Self-audit: no raw hex, no `style={{}}` for colors, components reused

## Stack
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- lucide-react (icons)

## File conventions
- Pages: `app/[route]/page.tsx`
- Shared UI: `"../../packages/ui/src/**/*.{ts,tsx}"`
- Feature components: `components/features/*`
- Assets: `public/*`

## Communication
- When they are any choices, ask before write a code.
- After editing, summarize change.