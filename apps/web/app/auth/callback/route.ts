import { type NextRequest, NextResponse } from "next/server";

import { createApiClient } from "@/lib/api-client";
import { sanitizeNextPath } from "@/lib/auth-utils";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Supabase OAuth callback (PKCE). The browser kicks off the flow with
 * `signInWithOAuth({ options: { redirectTo: <origin>/auth/callback?next=... } })`.
 * After the provider hop, Supabase redirects here with `?code=...` and the
 * PKCE verifier still in the cookie jar. `exchangeCodeForSession` validates
 * both and writes the access/refresh cookies via the shared cookie adapter.
 *
 * Note for ops: every callback URL used here must be present in the
 * Supabase project's "Redirect URLs" allowlist (Dashboard → Auth → URL
 * Configuration). Forgetting that is the most common 4xx on this flow.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeNextPath(searchParams.get("next"));
  const supabaseError = searchParams.get("error_description") ?? searchParams.get("error");

  if (supabaseError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(supabaseError)}&next=${encodeURIComponent(next)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("missing_code")}&next=${encodeURIComponent(next)}`,
    );
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("supabase_not_configured")}`,
    );
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`,
    );
  }

  // Local User row is materialized lazily via /users/me — fire-and-forget so
  // the redirect isn't blocked if the API is briefly unavailable. Feature
  // pages will retry on their first call.
  const accessToken = data.session?.access_token;
  if (accessToken) {
    void createApiClient({ accessToken })
      .users.me()
      .catch(() => undefined);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
