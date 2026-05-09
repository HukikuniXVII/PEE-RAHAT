import { redirect } from "next/navigation";

import { getServerAccessToken } from "./supabase/server";

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

/**
 * Use from a Server Component to gate the page on a Supabase session.
 * If unauthed, redirects to /login?next=<currentPath> so the login form
 * can return the user back where they tried to go.
 *
 * `currentPath` is the absolute path to round-trip back to (e.g. "/bookings",
 * `/chat/${id}`). Server Components don't have direct access to the current
 * pathname, so each caller passes its own.
 */
export async function requireAuth(currentPath: string): Promise<string> {
  const token = await getServerAccessToken();
  if (!token) {
    const search = new URLSearchParams({ next: sanitizeNextPath(currentPath) });
    redirect(`/login?${search.toString()}`);
  }
  return token;
}
