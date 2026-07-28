# 🏏 Eleven Super Kings — Match & Accounts

A mobile-first web app that replaces the team's Excel ledger. It tracks the
fixture list, who played, what each player owes and has paid, what was spent on
each match, and what the team is holding overall — plus a one-tap WhatsApp
summary to drop in the group chat.

Built with **Next.js 15 (App Router, TypeScript)**, **Prisma + PostgreSQL** and
**Tailwind CSS**, styled after light-mode iOS.

---

## What it does

| Area | Details |
| --- | --- |
| **Dashboard** | Team balance up top, then collected / spent / pending / squad size, who owes money, what's coming up, recent results, tournament dues and an expense breakdown. |
| **Matches** | Create tournament or practice fixtures with date, ground, overs, opponent and (for tournaments) the cup and fixture number. |
| **Roster & collections** | Tick the players who turned out — their profile fee fills in automatically. Record what each actually paid and whether it came by UPI or cash. Untickled players are recorded as absent with nothing payable. |
| **Expenses** | Ten preset categories plus free-text "Others", each with an optional note. |
| **Players** | Squad list with per-player outstanding, full match-by-match ledger, active/inactive status and a ₹100 / ₹200 default fee. |
| **Tournaments** | Entry fee tracked against the "Tournament fee" expenses booked on that cup's matches. |
| **Schedule** | Played matches and upcoming fixtures, grouped by month, with the next game highlighted. |
| **WhatsApp export** | Copies a formatted plain-text summary to the clipboard, or opens WhatsApp directly. |

### The five calculations

| # | Figure | Formula |
| --- | --- | --- |
| 1 | Player pending | `Σ payableAmount − Σ collectedAmount` across all their matches |
| 2 | Team balance | `Σ all collectedAmount − Σ all MatchExpense.amount` |
| 3 | Match net | `match collection − match expenses` |
| 4 | Tournament outstanding | `Tournament.totalFee − Σ "Tournament fee" expenses on its matches` |
| 5 | Schedule split | Matches before midnight IST today are *played*; the rest are *upcoming* |

---

## Access model

There is one **Admin** (you) and everyone else is **view-only**.

- **Admin** — sign in at `/login` with the PIN from `ADMIN_PIN`. Full create,
  edit and delete on every entity. The session is a signed, HTTP-only cookie
  that lasts 30 days.
- **Players** — no login. Share the site URL and they can read the dashboard,
  their own outstanding, the team balance and the schedule. No write action is
  reachable without the admin cookie: every mutating server action calls
  `requireAdmin()`, so hiding the buttons isn't the only thing stopping them.

Repeated wrong PINs are throttled (8 tries per 10 minutes per IP).

---

## Running it locally

**Prerequisites:** Node 20+ and a PostgreSQL database.

```bash
npm install
cp .env.example .env          # then edit the values
npx prisma migrate dev        # creates the tables
npm run db:seed               # optional: squad, grounds, cups, sample matches
npm run dev
```

Open http://localhost:3000. Sign in at `/login` with whatever you set as
`ADMIN_PIN`.

### Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string. |
| `ADMIN_PIN` | yes | The PIN you type at `/login`. |
| `AUTH_SECRET` | yes | ≥16 chars, signs the session cookie. `openssl rand -base64 32`. |

Without `ADMIN_PIN` / `AUTH_SECRET` the app still runs — it just stays
permanently in view-only mode and says so on the login page.

### Seed data

`npm run db:seed` loads a full sample season: 15 players (including **Anbu,
jersey #7**, plus Elango, Mani, Madhavan and the rest), 4 Chennai grounds, 2
tournaments, 9 played matches with rosters, collections and expenses, and 3
upcoming fixtures. It's safe to re-run — rows are upserted and match children
are rebuilt rather than duplicated.

### Useful scripts

```bash
npm run dev         # dev server
npm run build       # prisma generate + next build
npm run start       # production server
npm run typecheck   # tsc --noEmit
npm run db:migrate  # prisma migrate dev
npm run db:deploy   # prisma migrate deploy (production)
npm run db:seed     # seed sample data
npm run db:studio   # Prisma Studio
```

---

## Deploying to Railway

The repo ships a multi-stage `Dockerfile` (Next.js `standalone` output) and a
`railway.json` that points at it.

1. **Create the project** — in Railway, *New Project → Deploy from GitHub repo*
   and pick this repository. It will detect `railway.json` and build with the
   Dockerfile.
2. **Add PostgreSQL** — *New → Database → PostgreSQL* in the same project.
3. **Set the variables** on the app service:

   ```
   DATABASE_URL = ${{Postgres.DATABASE_URL}}
   ADMIN_PIN    = <your PIN>
   AUTH_SECRET  = <openssl rand -base64 32>
   ```

   The `${{Postgres.DATABASE_URL}}` reference keeps the two services in sync.
4. **Deploy.** `docker-entrypoint.sh` runs `prisma migrate deploy` before the
   server starts, so the schema is applied automatically on every release. No
   manual migration step.
5. **Generate a domain** under *Settings → Networking*, then share that URL with
   the team.
6. **Seed once** (optional) from the Railway shell:
   `npx prisma db seed`

Health checks hit `/api/health`, which verifies the process *and* its database
connection, so a deploy with a bad `DATABASE_URL` fails loudly instead of
serving errors.

`nixpacks.toml` is included as a fallback if you ever switch the service off the
Dockerfile builder.

### Deploying elsewhere

The app is a standard Next.js server app, so any host that runs Node works. Two
notes if you stray from Railway:

- **Vercel** — import the repo and set the same three variables. `output:
  "standalone"` switches itself off when `VERCEL` is set, since Vercel produces
  its own output format. Nothing runs migrations for you there, so apply them
  once yourself (`npx prisma migrate deploy` with `DATABASE_URL` pointed at the
  database).
- **Serverless hosts + pooled Postgres** — on a platform that starts a fresh
  function per request (Vercel, Lambda), point `DATABASE_URL` at a connection
  pooler rather than the database directly, or you will exhaust connections.
  With Supabase that means the transaction-mode pooler on port 6543 with
  `?pgbouncer=true&connection_limit=1` appended. A long-lived container
  (Railway, Fly, a VPS) does not need this.

---

## Project layout

```
prisma/
  schema.prisma          Player, Ground, Tournament, Match, MatchPlayer, MatchExpense
  seed.ts                sample season
  migrations/            generated SQL
src/
  app/
    page.tsx             dashboard
    matches/             list, new, [id] detail, [id]/edit
    players/             list, [id] ledger
    tournaments/         outstandings
    grounds/             venues
    schedule/            played vs upcoming
    login/               admin PIN
    api/health/          Railway health probe
    actions/             server actions (all writes go through requireAdmin)
  components/            UI kit, forms, nav, WhatsApp share
  lib/
    queries.ts           every calculation in one place
    whatsapp.ts          the export format
    auth.ts / session.ts signed-cookie admin auth
    format.ts            INR + IST formatting
```

### Notes on the data model

- **Times are IST.** Date inputs are wall-clock and get pinned to `+05:30`
  before storage, so a match at 8:00 AM reads as 8:00 AM for everyone.
- **Money is `Float`** per the original spec. All arithmetic is snapped to two
  decimals (`round2`) before display or comparison so floating-point noise never
  shows up in a total.
- **Deleting a player who has played** marks them inactive instead of deleting —
  a hard delete would cascade their match rows away and silently change the
  team's history. Players with no appearances are deleted outright.
- **Grounds and tournaments** can't be deleted while matches reference them.
- **`MatchPlayer` rows are only created once a roster is saved**, which is what
  keeps upcoming fixtures free of financial data.
