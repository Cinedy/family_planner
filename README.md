# Familieplanlegger

A family planner for the phone: shared calendar, grocery list, to-dos and a weekly dinner plan with recipes. Built for a Norwegian family on iPhones — the UI is in Norwegian (bokmål), times are Europe/Oslo, and it installs to the home screen as an app that also works offline.

## Features

- **Kalender** — month view, repeating events (daily/weekly/monthly/yearly), attendees, colours
- **Handleliste** — shared list, tick off, drag to reorder, quantities
- **Gjøremål** — to-dos with due dates and who it's assigned to
- **Måltider** — dinner plan per week, recipe library with ingredients; add a dinner's (or the whole week's) ingredients to the grocery list, skipping basics you always have
- **Hjem** — today's dinner, upcoming events, open to-dos and grocery count
- Family members and invitations by email; Google sign-in (Microsoft optional)
- Offline-first: every change shows instantly and syncs in the background

## How it works

The phone keeps its own copy of the family's data in IndexedDB ([Dexie](https://dexie.org)), and the screens read from that copy, so they never wait for the network.

1. A change is written to the local database **and** queued in an `outbox` table ([lib/local/mutations.ts](lib/local/mutations.ts)).
2. The sync engine ([lib/local/sync.ts](lib/local/sync.ts)) pushes the outbox to `POST /api/sync`, then pulls a full snapshot from `GET /api/sync` and replaces the local copy. It runs on app start, when the app comes back into view, when going back online, and every 30 s.
3. The server ([lib/sync/apply.ts](lib/sync/apply.ts)) applies each operation idempotently and only within the user's family. Operations are defined once, with validation, in [lib/sync/ops.ts](lib/sync/ops.ts).

A service worker ([public/sw.js](public/sw.js)) caches the app pages so the app opens without a connection. The pages under `app/(app)` are static shells; `proxy.ts` handles sign-in redirects.

Conflicts: last write wins. Family management, invitations and sign-in need a connection.

## Tech

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui on Base UI · Prisma 7 + PostgreSQL (Neon) · Auth.js v5 · Dexie · Resend · Vitest · hosted on Vercel (region `fra1`, next to the database).

> This Next.js version has breaking changes compared to older docs — see [AGENTS.md](AGENTS.md).

## Running locally

1. `npm install`
2. Create `.env.local`:

   | Variable | What |
   |---|---|
   | `DATABASE_URL` | Neon connection string (the pooled one, host contains `-pooler`) |
   | `AUTH_SECRET` | `openssl rand -base64 32` |
   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth client; redirect URI `…/api/auth/callback/google` |
   | `RESEND_API_KEY`, `RESEND_FROM` | For invitation emails |
   | `AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET` | Optional: shows "Fortsett med Microsoft" |
   | `APP_URL` | Optional: base URL for invite links (defaults to the Vercel production URL) |

3. `npm run dev` and open http://localhost:3000

The service worker only registers in production builds. To try offline mode locally: `npm run build:local && AUTH_TRUST_HOST=true npm start`.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Development server |
| `npm test` | Run the tests (`npm run test:watch` to keep watching) |
| `npm run lint` | ESLint |
| `npm run build` | **Production build: applies database migrations first** (used by Vercel) |
| `npm run build:local` | Build without touching the database |

## Changing the database

Migrations live in `prisma/migrations` and are applied automatically on every Vercel deploy (`prisma migrate deploy`).

1. Edit `prisma/schema.prisma`.
2. Generate the SQL for the change into a new folder, e.g. `prisma/migrations/3_<name>/migration.sql` (`npx prisma migrate diff --from-schema <old schema> --to-schema prisma/schema.prisma --script`), and run `npx prisma generate`.
3. Prefer additive changes (new columns with defaults): the old app version keeps running while the new one builds, and phones may still send changes from the old version.

Migrations connect directly to Neon (not through the pooler); [prisma.config.ts](prisma.config.ts) derives that URL from `DATABASE_URL`.

When adding a field that phones sync, update the op in `lib/sync/ops.ts` (make new fields optional so older app versions keep working), `lib/sync/apply.ts`, `lib/sync/snapshot.ts`, the types in `types/sync.ts`, and add a test.

## Known limitations

- **Invitation emails** only reach the address registered on the Resend account until a domain is verified in Resend. Until then, copy the invite link from the Resend dashboard and send it yourself.
- **Microsoft sign-in** requires an app registration in Azure, which needs an Azure directory; Hotmail users can instead create a Google account with their existing email address.

## Project layout

```
app/(app)/        Signed-in screens (static shells reading the local database)
app/(auth)/       Login and invitation pages
app/api/sync/     Sync endpoint
app/actions/      Server actions for family management and sign-out
components/       UI per feature (calendar, grocery, todos, meals, …), sync provider, shadcn/ui
lib/local/        On-device database, mutations and sync engine
lib/sync/         Shared op definitions; server-side snapshot and apply
lib/              Calendar/ingredient helpers, Prisma, Resend
prisma/           Schema and migrations
public/sw.js      Service worker
```
