// Pure helpers + types shared between Server Components (lib/auth.ts) and
// Client Components. This file MUST NOT import next/headers, the Supabase
// server client, or anything else that depends on the request context —
// otherwise client-side imports would pull those into the browser bundle
// and Next will refuse to build.

export interface InitialUser {
  displayName: string;
  email: string;
}

/**
 * Constrain a `next` redirect target to a same-origin relative path so a
 * malicious link like `?next=//evil.com/...` can't bounce the user off-site.
 */
export function sanitizeNextPath(raw: string | undefined | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";
  return raw;
}
