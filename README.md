# Fairpoint

A meetup-fairness app for groups coordinating across different transport modes in Singapore.

Follows the same architecture as the IS216 FLIP exemplar: Vue 3, Pinia stores as the
data layer, Vue Router, and Supabase (Postgres + Auth) as the backend. No custom
Express/Node server — the frontend talks to Supabase directly.

## Tech stack

| Layer      | Tech                                              |
|------------|----------------------------------------------------|
| Frontend   | Vue 3 (`<script setup>`), Vue Router, Pinia, Bootstrap 5 |
| Backend    | Supabase (Postgres database)                       |
| External APIs | OneMap (address search), NEA (weather)          |
| Build tool | Vite                                                |

## Prerequisites

- Node.js 18+
- A free [Supabase](https://supabase.com/) account
- A free [OneMap](https://www.onemap.gov.sg/apidocs/) account

## 1. Clone and install

```bash
git clone <your-repo-url>
cd fairpoint
npm install
```

## 2. Create your own Supabase project

1. Go to [supabase.com](https://supabase.com/) and sign in.
2. Click **New Project**, name it, set a database password (save it somewhere).
3. Wait for provisioning (usually under two minutes).

## 3. Create the database schema

1. In your Supabase project, open **SQL Editor**.
2. Open [`supabase/schema.sql`](supabase/schema.sql), copy its contents, paste into a new
   query, and run it. This creates `groups`, `members`, and `meetup_history` tables.

This schema ships without Row Level Security, same as the FLIP exemplar — fine for local
learning, but add RLS before treating this as anything beyond that.

## 4. Set your environment variables

```bash
cp .env.example .env
```

Fill in inside .env file GUYSS 67:
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from Supabase's
  **Project Settings → General** and **Project Settings → API Keys**.
- `VITE_ONEMAP_EMAIL` / `VITE_ONEMAP_PASSWORD` from your OneMap account.
- NEA's weather API needs no key.

`.env` is gitignored — never commit your real keys.

## 5. Run the app

```bash
npm run dev
```

Open the printed local URL. You'll land on the page to create or join a group — no account
needed to join, per the project's "no account required to join" design.

## Project structure

```
src/
├── components/       # AddressSearch (OneMap), WeatherWidget
├── composables/       # useWeather — reusable stateful logic, no Supabase calls
├── lib/                # supabase.js (client setup), onemap.js (token + search)
├── router/             # Vue Router routes
├── stores/             # Pinia stores — group.js owns all Supabase queries
└── views/
    ├── LandingView.vue  # create / join a group
    └── GroupView.vue    # members, add-member form, weather

supabase/schema.sql      # DB schema — run this in Supabase's SQL Editor
```

## Concepts carried over from the exemplar

- **Pinia stores as the data layer** — components never call `supabase` directly; they
  call store actions like `groupStore.addMember(...)`. `stores/group.js` converts raw rows
  (`join_code`, `postal_code`) into camelCase view models (`joinCode`, `postalCode`) via
  `toGroup`/`toMember`, the same seam as `toCard`/`toDeck` in the exemplar.
- **A composable for reusable stateful logic** — `useWeather.js` holds weather state with
  zero Supabase calls, same separation as `useStudySession.js`.
- **No auth guard** — unlike the exemplar's role-based redirects, Fairpoint groups are
  joined by shareable link/code, so there's no login flow to guard.

## Pushing to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Supabase-backed group creation, address search, weather"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

`.env` is gitignored, so your Supabase and OneMap credentials will not be pushed. Each
teammate who clones the repo needs their own `.env` — either their own free Supabase
project, or point `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` at one teammate's
shared project so everyone reads/writes the same database.
