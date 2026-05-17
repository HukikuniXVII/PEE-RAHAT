# Supabase Google sign-in setup (social OAuth on /login)

This runbook enables the "Sign in with Google" button on `/login`. It's
the **Supabase social OAuth** flow — completely independent from the
per-tutor Calendar/Meet OAuth covered in
[`docs/google-oauth-setup.md`](./google-oauth-setup.md). They use
different Google Cloud OAuth clients, different redirect URIs, and
different env vars.

| | This doc (social login) | `google-oauth-setup.md` (Meet) |
| --- | --- | --- |
| Purpose | Sign in / sign up with Google identity | Mint Meet links on the tutor's calendar |
| Who connects | Any user on `/login` | Only tutors, from `/tutors/me/edit` |
| Code path | `supabase.auth.signInWithOAuth({ provider: "google" })` | `/auth/google/connect` (API) |
| Credentials owner | Supabase project (stored in dashboard) | apps/api (env vars) |
| Redirect URI | `https://<project>.supabase.co/auth/v1/callback` | `http://localhost:3001/api/auth/google/callback` |

If the button on `/login` returns
`"Unsupported provider: provider is not enabled"`, the Supabase project
hasn't been through this runbook yet.

This is operations work — run it once per environment.

## 1. Google Cloud OAuth client (separate from the Meet one)

Reuse the Cloud project from the Meet setup if you have one, or create a
fresh project. The OAuth **client** must be new — the Meet client's
redirect URI is on `apps/api`, not Supabase.

1. https://console.cloud.google.com/apis/credentials → **Create
   credentials** → **OAuth client ID**.
2. Application type: **Web application**. Name it
   `peerahat-supabase-login` to keep it separate from the Meet client.
3. Authorized JavaScript origins:
   - Dev: `http://localhost:3000`
   - Prod: your web origin (e.g. `https://peerahat.co`)
4. Authorized redirect URIs — get the exact value from Supabase
   Dashboard > Authentication > Providers > Google, "Callback URL (for
   OAuth)". It looks like
   `https://<project-ref>.supabase.co/auth/v1/callback`. Paste both
   the dev and prod project callbacks here if you use separate Supabase
   projects.
5. Save. Copy the **Client ID** and **Client secret**.

The OAuth consent screen needs scopes `openid`, `email`, `profile` — the
Cloud project's default for a Web client already includes these, so
nothing to add.

## 2. Supabase dashboard — Auth > Providers > Google

1. Open the Supabase project in the dashboard.
2. Authentication > Providers > Google → toggle **Enabled** on.
3. Paste the Client ID and Client secret from step 1.
4. Save.

After step 4 the `/login` button stops returning `"Unsupported
provider..."`. The rest of this doc is the URL config that makes the
in-app callback work.

## 3. Supabase URL configuration

Authentication > URL Configuration:

- **Site URL**: the canonical web origin.
  - Dev: `http://localhost:3000`
  - Prod: `https://peerahat.co` (or your prod host)
- **Additional Redirect URLs**: add the in-app callback Next.js handles.
  - Dev: `http://localhost:3000/auth/callback`
  - Prod: `https://peerahat.co/auth/callback`

This is **not the same** as the Google Cloud redirect URI from step 1.
Google → Supabase uses the `supabase.co/auth/v1/callback` URI;
Supabase → your app then redirects to one of the URLs listed here.
Missing the in-app callback causes a `"requested path is invalid"`
error on the bounce-back.

## 4. Env vars

`apps/web` already reads two Supabase vars from `.env`:

| Var | Source |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard > Project Settings > API > Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard > Project Settings > API > anon key |
| `NEXT_PUBLIC_SUPABASE_GOOGLE_ENABLED` | `"true"` (default) shows the button; `"false"` hides it |

Set `NEXT_PUBLIC_SUPABASE_GOOGLE_ENABLED=false` in `apps/web/.env.local`
while step 1 + step 2 are still pending so the Google button doesn't
appear at all. Next.js inlines `NEXT_PUBLIC_*` at build / dev start —
restart `pnpm dev` after toggling.

## 5. Local verification

1. With the env var set to `true` (or unset) and `pnpm dev` running,
   visit `http://localhost:3000/login`.
2. Click "เข้าสู่ระบบด้วย Google". The browser should redirect to
   Google's consent screen for the OAuth client created in step 1.
3. Approve. Google redirects to
   `https://<project>.supabase.co/auth/v1/callback?code=...` (step 1
   URI), Supabase exchanges and redirects to
   `http://localhost:3000/auth/callback?code=...` (step 3 URL).
4. The Next route handler `apps/web/app/auth/callback/route.ts` calls
   `supabase.auth.exchangeCodeForSession(code)`, writes the session
   cookies, then redirects to the sanitized `next=` (default `/`).
5. Refresh once. `getInitialUser()` returns the new Google identity and
   the site-nav account chip shows the Google display name + email.

## 6. Troubleshooting

| Error | Where it comes from | Fix |
| --- | --- | --- |
| `Unsupported provider: provider is not enabled` (400) | Supabase rejecting the `signInWithOAuth` call | Step 2 — toggle Google on in Supabase Auth > Providers |
| `redirect_uri_mismatch` | Google Cloud rejecting Supabase | Step 1 — add Supabase's callback URL (`<project>.supabase.co/auth/v1/callback`) to the OAuth client's Authorized redirect URIs |
| `requested path is invalid` after Google consent | Supabase rejecting the bounce-back into the app | Step 3 — add `http://localhost:3000/auth/callback` (or prod equivalent) to Supabase Auth > URL Configuration > Additional Redirect URLs |
| Button doesn't appear at all on `/login` | `NEXT_PUBLIC_SUPABASE_GOOGLE_ENABLED=false` in the active env | Step 4 — unset or set to `true`, restart `pnpm dev` |
| Stuck on consent screen with "unverified app" warning | OAuth consent screen still in test mode | Cloud Console > APIs & Services > OAuth consent screen → either publish (requires Google review for full scopes) or add the Gmail address as a test user |

All Supabase auth errors are mapped to Thai user copy via
`supabaseAuthErrorMessage` in `apps/web/lib/error-message.ts` — if you
need to translate a new error string, add a substring match there.

## 7. Production

When you bring up a separate Supabase project for production, repeat
steps 1–4 against the prod project. Either create a second OAuth client
in Google Cloud for the prod callback or add the prod callback URL to
the existing client's Authorized redirect URIs. Both work; separate
clients keep dev / prod incidents from cross-contaminating.
