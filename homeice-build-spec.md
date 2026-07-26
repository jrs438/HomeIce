# HomeIce — Family Operations App — Build Spec

You are building **HomeIce** (working name), a private family organizer PWA for one family. Build it production-quality but pragmatic: this serves 6 people, not 6 million. Optimize for the mother of the family being able to run the whole week through natural-language input without filling out forms.

## The family

| Person | Role | Details |
|---|---|---|
| Dad (Jeremy) | Parent/admin | Works, travels; Outlook calendar (phase 2 sync) |
| Mom (Shira) | Parent/admin | Primary scheduler; NL input is built for her |
| Jonah | Kid, 16 | 10th grade, **The Frisch School** (Paramus); **hockey** |
| Ava | Kid, 13 | 8th grade, **Yavneh Academy** (Paramus); **dance** |
| Emma | Kid, 6 | 1st grade, **Yavneh Academy**; **hockey (mini-mites) + gymnastics** |
| Sitter | Full-access member | Name TBD — configurable in settings |

Observant Jewish family (Paramus/River Edge, NJ): Shabbat and Yom Tov awareness is a core feature, not a nice-to-have. Kosher stores in grocery lists. Hebrew dates displayed alongside Gregorian.

## Stack

- **Next.js (App Router, TypeScript)** deployed on **Vercel**, GitHub repo
- **Postgres** (Neon or Vercel Postgres) with **Drizzle ORM**
- **Auth**: simple email magic-link or shared-family-password + per-person profile selection (this is a family app; do not over-engineer auth). All members including sitter have full access. Admin flag on parents for settings/member management.
- **PWA**: installable, offline-tolerant shell, push notifications via web-push
- **Anthropic API** (claude-sonnet-4-6) for all parsing (NL commands, email, images)
- **Email — no custom domain**: a dedicated family Gmail account handles both directions. Inbound: poll via Gmail API (OAuth, readonly) for messages from allowlisted senders → capture pipeline. Outbound: Gmail SMTP via nodemailer + app password for the Sunday digest.
- **Scheduling** (Vercel Hobby-friendly): secured API routes triggered by **cron-job.org** (free) — Gmail poll every 5 min, ICS feeds 3–4x/day, digest Sunday 6pm, cleanup daily. Additionally fire a Gmail poll on app open (fire-and-forget from the client) so day-of forwards are effectively instant. All routes protected by CRON_SECRET.

## Design system — two themes, one structure

Single component structure, two skins. Default: light. Per-device preference.

**Light = "The Program"**: warm paper `#F7F5EF`, ink `#111111`, amber accent `#D97706`, dashed hairline rules `#D8D4C6`, black icon tiles, masthead header ("THE PROGRAM" style, Archivo Black), driver pucks (bordered pill: color chip + car icon + NAME spelled out — never initials alone).

**Dark = "Rink Board"**: near-black `#0A0F1A`, panel `#101A2E`, border `#1C2740`, text `#E2E8F4`, yellow accent `#FACC15`, glowing status dots, NEXT lane marker in yellow, uppercase Space Grotesk labels.

**Fonts**: Archivo Black (mastheads), Archivo (UI), Space Grotesk (numerals/labels/dark theme), Instrument Serif (light-theme day headers). **Icons**: lucide-react only — Snowflake (hockey), Music (dance), Dumbbell (gymnastics), GraduationCap (school), Car, MapPin, Utensils, Flame (candles), CalendarDays.

**Person colors**: Jonah `#2563EB`, Ava `#DB2777`, Emma `#F59E0B`, Dad `#059669`, Mom `#7C3AED`, Sitter `#0D9488`. Dark-theme variants ~30% lighter. **External drivers** render as outlined chips (white/transparent bg, 1.5px border in a neutral slate), visually distinct from filled family chips, always with name label.

## Data model (Drizzle)

- `members` (id, name, role: parent|kid|sitter, color, isAdmin, email?, pushSubscription?)
- `external_drivers` (id, name, label e.g. "Grandma", phone?, notes?) — Grandma, Grandpa, Bardavids seeded
- `events` (id, title, start, end?, allDay, location?, kidIds[], source: manual|ics|email|capture, sourceRef?, icsUid?, status: proposed|confirmed|cancelled, notes?)
- `rides` (id, eventId?, date, time, kind: activity_dropoff|activity_pickup|school_pickup, kidIds[], from, to, driverType: member|external|carpool|unassigned, driverId?, confirmed) — **NO school drop-off rides. School pickups home + all activity legs only.**
- `ride_rules` (recurring defaults: e.g. "Wed dance pickup → external:grandma", "Thu hockey there → external:bardavid, back → member:dad"). Weekly generation job materializes rides from events + rules; exceptions edit the instance.
- `grocery_items` (id, store, item, addedBy, done, doneAt). Stores enum, configurable in settings: Costco, BJ's, ShopRite, + kosher store(s) — seed "Kosher (set name in Settings)".
- `chores` (id, memberId, title, cadence, done, week)
- `dinner_menu` (id, date, meal, requestedBy?, isYomTov)
- `dinner_requests` (id, memberId, text, votes)
- `ics_feeds` (id, url, label, kidIds[], lastPolled, active)
- `inbox_items` (id, source: email|capture_image|capture_text, raw, parsedActions jsonb, status: pending|approved|dismissed, createdAt)
- `settings` (kv: family name, kosher store names, candle-lighting location zip 07652, digest day/time, sitter name)

## Core screens (bottom nav)

1. **Today** — masthead with Gregorian + Hebrew date (Hebcal); **quick-add capture box pinned at top** ("Type or say anything…" + mic via browser dictation + photo attach); run-of-show timeline (events merged with rides, NEXT highlighted); dinner strip; candle-lighting/Yom Tov strip when Friday/Erev Yom Tov (Hebcal API, zip 07652); pending-inbox badge.
2. **Rides** — week view, per-day list of ride legs with driver pucks; tap driver → picker sheet (family members, external drivers, carpool, unassigned); red badges on unassigned; rules editor ("defaults") reachable here.
3. **Calendar** — day/week/month, person-color coded, all sources merged; tap event → detail (edit, cancel, add ride legs).
4. **Shop** — store tabs with counts, check-off, add box, shows who added; checked items auto-clear after 48h.
5. **Jobs** — per-kid chore list, weekly reset, done toggles. (Stars/rewards = phase 2; design the schema to allow points later.)
6. **Eat** — week menu incl. auto-labeled Shabbat/Yom Tov rows; request list with ❤️ voting; parents promote request → menu slot.
Plus **Inbox** (approval queue, from Today badge) and **Settings** (members, external drivers, stores, feeds, sitter name).

## The capture pipeline (the most important feature)

Single endpoint `POST /api/capture` accepting `{type: text|image|email, content, from}`. All doors lead here:
- **In-app quick-add box** (text/dictation/photo) — the primary input
- **Inbound email**: the family Gmail inbox, polled on schedule; only allowlisted senders (member emails) are processed, everything else ignored. Mark processed messages with a label.
- **Apple Shortcut** posts shared content (image/text/URL) with a shared-secret header. Include `docs/shortcut-setup.md` with the exact Shortcut recipe (Receive input → Get contents of URL POST → Show notification with response).

Claude call with a strict system prompt containing full family context (members, kids' schools/activities, external drivers, stores, current week's events) and a JSON action schema:
`add_event | cancel_event | modify_event | assign_ride | add_ride_rule | add_grocery {store,item}[] | add_chore | request_dinner | set_menu | unknown`
Multiple actions per input allowed. Resolution rules: "my mom"/"grandma" → external:grandma; kid nicknames; "shoprite/costco/bjs/kosher" → store enum; ambiguous dates → return `clarification_needed` with a question.

**Confirmation tiers**: groceries + dinner requests apply instantly (undoable). Events/rides/menu changes apply but return confirmation cards in the UI with one-tap Undo (store inverse action, 24h window). Bulk parses (email with 3+ events) go to Inbox as proposed, require approve. Never silently discard input — anything unparseable lands in Inbox as `unknown` with the raw content.

## Integrations (phase 1)

- **Hebcal API**: candle lighting/havdalah for 07652, Yom Tov calendar, Hebrew dates. Cache daily.
- **ICS feeds**: per-feed cron poll (hourly), upsert by icsUid, changed events flag affected rides ("time changed — driver still OK?" notification).
- **Sunday digest**: email to parents via the family Gmail (SMTP), 6pm Sunday
- **Ride calendar invites**: when a ride is assigned to a member with an email (or an external driver with one), send a real calendar invite (ICS METHOD:REQUEST attachment via Gmail SMTP) — reassignments send updates, unassignments send cancellations (track SEQUENCE/UID per ride). This is how family obligations reach the parents' work calendars; no Graph API needed.
- **Work-calendar busy overlay (optional)**: parents may add a published Outlook ICS URL ("availability only") as a feed with kind=busy; rendered as gray blocks on Rides/Calendar for conflict-spotting. Degrade gracefully if IT blocks publishing — invites above are the primary mechanism. — week's events per kid, unassigned rides in red, this week's menu, open inbox items.
- **Push notifications**: inbox arrivals, ride assignment changes, day-of morning summary (7am) to parents + sitter.

## Phase 2 (build hooks, not features)
Stars/rewards (Emma), visual routines, Twilio SMS capture channel, TeamSnap OAuth, per-event comment threads.

## Phase 3
`/display` (read-only wall dashboard, dark theme, auto-refresh) and `/display/frame.png` — server-rendered **1920×1080** PNG (the Frame is a 32" 2020 model, 1080p) via satori or puppeteer-core, for Home Assistant art-mode push. Recipe→grocery import.

## Build order
1. Scaffold, auth, members, design system (both themes), bottom nav
2. Events + Calendar + Today
3. Rides + rules + external drivers
4. Shop, Jobs, Eat
5. Capture pipeline + Inbox (in-app box first, then email, then Shortcut endpoint)
6. Hebcal, ICS polling, digest, push
7. Polish: PWA install, empty states, seed data matching this spec

Seed the database with the family above, external drivers (Grandma, Grandpa, Bardavid family), stores, and a realistic sample week so the app demos well immediately.

Write clean code, commit in logical increments with clear messages, and maintain a README covering env vars (DATABASE_URL, ANTHROPIC_API_KEY, GMAIL_USER, GMAIL_APP_PASSWORD, GMAIL_OAUTH creds for API polling, CRON_SECRET, CAPTURE_SECRET, VAPID keys) and local dev setup.
