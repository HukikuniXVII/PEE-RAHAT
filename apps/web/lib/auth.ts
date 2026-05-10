import type { ChatThread } from "@peerahat/types";
import { redirect } from "next/navigation";

import { createApiClient } from "./api-client";
import { sanitizeNextPath, type InitialUser } from "./auth-utils";
import { createSupabaseServerClient, getServerAccessToken } from "./supabase/server";

export type { InitialUser } from "./auth-utils";
export { sanitizeNextPath } from "./auth-utils";

/**
 * Server-side fetch of the calling viewer's chat threads, used to seed the
 * site-nav unread-count badge without a hydration flash. Returns [] when
 * unauthed or when the request fails (the badge is non-critical UX).
 */
export async function getInitialThreads(): Promise<ChatThread[]> {
  const token = await getServerAccessToken();
  if (!token) return [];
  try {
    return await createApiClient({ accessToken: token }).chat.threads();
  } catch {
    return [];
  }
}

/**
 * Read the calling Supabase principal's display name + email from cookies so
 * the server-rendered nav can show the right state (account chip vs Login)
 * without a hydration flash. Returns null when unauthed.
 */
export async function getInitialUser(): Promise<InitialUser | null> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const meta = (data.user.user_metadata ?? {}) as { displayName?: string };
  const fallback = data.user.email?.split("@")[0] ?? "User";
  return {
    displayName: meta.displayName ?? fallback,
    email: data.user.email ?? "",
  };
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

/**
 * Use from an /admin/* Server Component. Wraps requireAuth, then calls
 * /users/me to read the canonical role. Non-admins are redirected to "/"
 * so the page never renders for them.
 */
export async function requireAdmin(currentPath: string): Promise<string> {
  const token = await requireAuth(currentPath);
  const me = await createApiClient({ accessToken: token }).users.me();
  if (me.role !== "admin") {
    redirect("/");
  }
  return token;
}
