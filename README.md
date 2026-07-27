# HomeIce

A private family operations PWA for the Spiers — Today timeline, rides, calendar,
shopping lists, chores, dinner planning, and a natural-language capture pipeline
that turns texts/emails/photos into scheduled events. See `spec.md` for the full
product spec and build order.

## Stack

Next.js (App Router, TypeScript) on Vercel, Postgres (Neon) via Drizzle ORM,
Anthropic API for NL parsing, Gmail (API + SMTP) for inbound/outbound email,
cron-job.org for scheduling.

## Environment variables

Set these in Vercel (Production + Preview):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string |
| `ANTHROPIC_API_KEY` | Claude API calls for the capture pipeline |
| `CAPTURE_SECRET` | Shared secret for the Apple Shortcut capture endpoint; also used to sign session cookies |
| `CRON_SECRET` | Shared secret required on all `/api/cron/*` and `/api/admin/*` routes |
| `GMAIL_USER` | Family Gmail address used for SMTP + API polling |
| `GMAIL_APP_PASSWORD` | Gmail app password for SMTP (digest + calendar invites) |
| `GMAIL_OAUTH_CLIENT_ID` | OAuth client ID for Gmail API inbox polling (readonly) |
| `GMAIL_OAUTH_CLIENT_SECRET` | OAuth client secret |
| `GMAIL_OAUTH_REFRESH_TOKEN` | OAuth refresh token for the family Gmail account |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web push notification keys |

Copy `.env.example` to `.env` for local dev.

## Local dev setup

```bash
npm install
npm run db:generate   # regenerate SQL migrations after a schema change
npm run db:migrate     # apply migrations to DATABASE_URL
npm run db:seed        # seed family members, external drivers, settings
npm run dev
```

## Deploying / migrating in production

The Vercel serverless function bundle can't run a local DB connection, so
migrations and seeding are exposed as secret-protected admin routes instead of
a build step:

```bash
curl -X POST https://<deployment>/api/admin/migrate -H "x-cron-secret: $CRON_SECRET"
curl -X POST https://<deployment>/api/admin/seed    -H "x-cron-secret: $CRON_SECRET"
```

Run `migrate` after every deploy that changes `src/db/schema.ts`. `seed` is a
no-op once members already exist.

## Auth

Family app, not enterprise auth: enter the shared family password (Settings →
"Family password", default `homeice`), then pick your profile. Sessions last 90
days per device. Parents are admins and can manage members/settings; the sitter
and kids get full read/write access to the app itself.

## Scheduled jobs (cron-job.org)

All `/api/cron/*` routes require header `x-cron-secret: $CRON_SECRET`. Set these
up as free cron-job.org jobs pointed at your deployment:

| Route | Suggested schedule | Purpose |
|---|---|---|
| `POST /api/cron/gmail-poll` | every 5 min | Poll the family Gmail inbox for allowlisted senders and run them through the capture pipeline |
| `POST /api/cron/ics-poll` | hourly | Poll all active ICS feeds (Settings → Calendar feeds), upsert events, flag rides whose linked event time changed |
| `POST /api/cron/digest` | Sunday 6pm (or whatever Settings → Digest day/time says) | Email the weekly digest to parents; the route itself also checks the day matches before sending |
| `POST /api/cron/morning-summary` | daily 7am | Push notification with today's run-of-show to parents + sitter |
| `POST /api/cron/cleanup` | daily | Delete checked-off grocery items older than 48h and expired undo-log rows |
| `POST /api/cron/events-generate` | weekly (e.g. Sunday 3am) | Materialize the next few weeks of recurring events + their linked rides from Settings → Recurring events |

Gmail polling and the digest/ride-invite emails degrade gracefully (return
`{configured: false}` / skip sending) until `GMAIL_OAUTH_CLIENT_ID/SECRET/REFRESH_TOKEN`
(inbound) and a verified `GMAIL_USER`/`GMAIL_APP_PASSWORD` (outbound) are in
place — expected while the family Gmail account is pending Google's review.
Push notifications no-op until `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` are set.

See `docs/shortcut-setup.md` for the Apple Shortcut capture recipe.
