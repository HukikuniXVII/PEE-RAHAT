# Google Meet auto-link setup (FR-TH-17)

The platform mints a Google Meet link for every booking the moment its
payment is approved (slip-verify or admin approval). It does this by
creating a Google Calendar event under a single dedicated platform
mailbox; attaching a `conferenceData.createRequest` to that event is
the only API path Google exposes for programmatic Meet generation.

Meet generation runs inline inside the payment-confirm transaction path
but is wrapped in try/catch — a Calendar outage logs and admin retries
via `POST /admin/bookings/:id/regenerate-meet`; the payment itself
never fails because Meet was unreachable.

These steps are operations work — run once per environment, then the
runtime needs only the env vars in §5.

## 1. Google Cloud + Workspace prerequisites

1. **Workspace tenant.** Buy or repurpose a Google Workspace plan on the
   `peerahat.co` domain (Business Starter is sufficient — conferencing is
   bundled). Free Gmail accounts cannot grant the domain-wide delegation
   we need.
2. **Calendar owner mailbox.** Create a service-style mailbox, e.g.
   `classes@peerahat.co`. Every event created by the worker lives on
   this user's primary calendar. **Sign in once** and accept the
   Workspace ToS, otherwise impersonated API calls return
   `policyPermissionDenied`.

## 2. Google Cloud project

1. In the Workspace's linked Google Cloud project, **enable Google
   Calendar API**: APIs & Services → Library → "Google Calendar API" →
   Enable.
2. Create a **service account**: IAM & Admin → Service Accounts → Create.
   - Name: `peerahat-meet-bot`
   - No project roles needed (Calendar API is gated per-user, not via
     IAM).
3. On the new service account: Keys → Add Key → JSON. Download the JSON
   file; treat it as a secret.

## 3. Domain-wide delegation

The service account must impersonate `classes@peerahat.co` so events
appear on a real Workspace user's calendar (rather than the service
account's own calendar, which has no Meet entitlements).

1. Service account detail page → "Enable Google Workspace Domain-wide
   Delegation". Copy the **Client ID** (a long number).
2. Workspace admin console (`admin.google.com`) → Security → Access and
   data control → API controls → Domain-wide delegation → Add new.
   - Client ID: paste from step 1.
   - OAuth scopes: `https://www.googleapis.com/auth/calendar.events`
3. Wait a few minutes for propagation.

## 4. Encode the key

The runtime reads the service-account JSON as a single base64 env var so
nothing about the key touches the repo:

```bash
# macOS / Linux
base64 -w0 < service-account.json

# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account.json"))
```

## 5. Environment variables

Add to your runtime secrets (e.g. AWS Secrets Manager, Doppler):

| Var | Value |
| --- | --- |
| `GOOGLE_MEET_ENABLED` | `true` to fire Calendar; `false` posts the fallback chat message instead |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | the service account's address, e.g. `peerahat-meet-bot@peerahat-prod.iam.gserviceaccount.com` |
| `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64` | base64 from step 4 |
| `GOOGLE_CALENDAR_OWNER_EMAIL` | the Workspace mailbox the worker impersonates, e.g. `classes@peerahat.co` |

`GOOGLE_MEET_ENABLED=false` keeps the booking flow shippable before
Workspace is provisioned — payment-confirm logs the booking and posts a
Thai fallback chat message ("ลิงก์ห้องเรียนจะส่งให้ก่อนเวลาเรียน — สอบถาม
พี่ติวได้") instead of calling the API.

## 6. Smoke test

```bash
# In a Nest REPL or one-off script:
const meet = app.get(GoogleMeetService);
await meet.createForBooking("<paid-booking-id>");
```

Expectations:

- A new event appears on `classes@peerahat.co`'s primary calendar.
- Both `student.email` and `tutor.user.email` receive invites with a
  Meet link.
- The booking row has `meetLink` populated and a system message lands in
  the booking's chat thread.

If `events.insert` returns `200` but `data.hangoutLink` is missing,
Workspace conferencing is disabled at the org level — confirm under
Workspace admin → Apps → Google Workspace → Google Meet → Service
status = ON.

## 7. Rotating the key

1. Generate a new JSON key in Cloud Console, encode it, swap
   `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64`, redeploy.
2. Delete the old key from the service account.
3. JWT auth refreshes on the next call — no further action needed.

## 8. Phase 2 migration note

When in-platform video lands (FR-TH-08), this whole module retires —
keep the Calendar event creation but swap the conferencing solution from
`hangoutsMeet` to the LiveKit room URL, or remove it entirely if the
classroom UI handles the join flow.
