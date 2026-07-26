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

All `/api/cron/*` routes require header `x-cron-secret: $CRON_SECRET`. See
`docs/shortcut-setup.md` for the Apple Shortcut capture recipe.
