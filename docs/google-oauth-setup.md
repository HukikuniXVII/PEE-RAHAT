# Google OAuth setup for tutor Meet links (FR-TH-17 rev3)

Each tutor connects their own personal `@gmail.com` via OAuth2. The
platform stores their encrypted `refresh_token` and creates Meet links
on their calendar at payment-confirm. **No Google Workspace required.**

This is operations work — run it once per environment.

## 1. Google Cloud project

You need a Cloud project to host the OAuth client. Free works.

1. https://console.cloud.google.com/projectcreate → create a project
   (e.g. `peerahat-prod`).
2. https://console.cloud.google.com/apis/library/calendar-json.googleapis.com
   → click **Enable** (Google Calendar API).

## 2. OAuth consent screen

1. https://console.cloud.google.com/apis/credentials/consent
2. User type: **External** (since tutors are individual Gmail accounts,
   not a Workspace tenant).
3. Fill in app name (`Pee Rahat`), support email, developer email.
4. Scopes: add all three. `calendar.events` is for the Meet creation;
   `userinfo.email` + `openid` let the OAuth callback read the tutor's
   Google address to persist alongside the refresh token.
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `openid`
5. Test users: while the app is unverified, add the Gmail addresses of
   the tutors you want to test with. Move to **production** after
   Google verifies — until then non-test-users will see the "unverified
   app" warning.

## 3. OAuth client credentials

1. https://console.cloud.google.com/apis/credentials → **Create
   credentials** → **OAuth client ID**.
2. Application type: **Web application**.
3. Authorized redirect URIs:
   - Dev: `http://localhost:3001/api/auth/google/callback`
   - Prod: `https://api.peerahat.co/auth/google/callback`
4. Save. Copy the **Client ID** and **Client secret**.

## 4. Generate encryption + state secrets

The refresh tokens are AES-256-GCM encrypted in the DB. The state token
that round-trips through Google during the OAuth dance is a signed JWT.

```powershell
# AES-256 key (32 bytes, base64)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# State JWT secret (any high-entropy string)
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Keep both out of source control.

## 5. Environment variables

| Var | Value |
| --- | --- |
| `GOOGLE_OAUTH_CLIENT_ID` | from step 3 — ends in `.apps.googleusercontent.com` |
| `GOOGLE_OAUTH_CLIENT_SECRET` | from step 3 |
| `GOOGLE_OAUTH_REDIRECT_URI` | the URI you registered in step 3 — must match exactly |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | from step 4 — base64-encoded 32-byte key |
| `GOOGLE_OAUTH_STATE_JWT_SECRET` | from step 4 — signs the state JWT carrying tutorId |

## 6. Tutor connect flow

After deploy, a tutor signs in, opens `/tutors/me/edit`, and clicks
"เชื่อมต่อ Google Calendar". The frontend POSTs to
`/auth/google/connect`, receives the authorization URL, redirects the
browser to Google's consent screen. Tutor approves; Google redirects
back to `/auth/google/callback?code=…&state=…`. The backend:

1. Verifies the state JWT.
2. Exchanges the code for tokens (`access_token` + `refresh_token`).
3. Fetches the tutor's Google email via `oauth2.userinfo.get`.
4. Encrypts the refresh token, persists `googleRefreshToken` +
   `googleEmail` + `googleConnectedAt` on `TutorProfile`.
5. Redirects to `/tutors/me/edit?google=connected&email=...` so the UI
   can toast + refresh the status pill.

From here, every paid booking on this tutor mints a Meet on their
calendar inline at payment-confirm.

## 7. Key rotation

Refresh tokens stay valid until the tutor revokes access in their Google
account settings or until 6 months of inactivity. Rotating
`GOOGLE_TOKEN_ENCRYPTION_KEY` invalidates the existing stored tokens —
every tutor would need to reconnect. Don't rotate unless you have to.

If you do rotate: deploy with the new key, then run a one-off script
that decrypts all `googleRefreshToken` values with the old key and
re-encrypts with the new one. (Not built yet — write when needed.)

## 8. Local development

The dev `.env` ships with these unset. The OAuth flow throws
`GOOGLE_OAUTH_CLIENT_ID / _CLIENT_SECRET / _REDIRECT_URI not set` if a
tutor tries to connect — graceful 400.

To exercise the flow against your own Google account:

1. Create your own Cloud project + OAuth client (same steps above) with
   `http://localhost:3001/api/auth/google/callback` as redirect URI.
2. Fill the 5 env vars in your local `.env`.
3. `pnpm dev:api` reads env at boot — restart after editing `.env`.
4. Sign into the web app as a tutor (`kantee.k@kkumail.com` works in
   dev), go to `/tutors/me/edit`, click connect.

The seed tutors are `isVerified=true` but `googleRefreshToken=null`, so
they're invisible in search until at least one of them connects.
