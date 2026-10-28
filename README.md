# Fairpoint

Meet-in-the-middle hangout planner (IS216 WAD2). Each friend adds where they're coming from and how they're travelling. Fairpoint finds the fairest midpoint, shows crowd levels and weather, suggests nearby spots ranked by the group's preferences, and the group votes on the final spot.

Figma: https://www.figma.com/design/VPDZrAHBK7HWniY3HM2wUY

Stack: Vue 3 + Vite, Bootstrap 5, Pinia, Supabase (Postgres, Auth, Realtime), Leaflet, Vercel, Playwright.

## Getting started

You need Node 22.18 or newer (`node -v` to check).

```bash
git clone <repo-url>
cd WAD2
npm install
cp .env.example .env.local     # then paste in your keys
npm run dev                    # http://localhost:5173
```

The demo hangout and most services have sample data (see [Sample data](#sample-data)). Nearby spots require `GOOGLE_PLACES_API_KEY` in `.env.local`; the Explore page lists real Google Places around the hangout's saved midpoint and reports an error if the API key is unavailable. Google Places calls are off by default; enable them on Explore to load nearby spots. The preference is saved in the browser and also controls spot details and photos. Adding a spot to vote inserts it into that hangout's Supabase `shortlist`; Supabase records the signed-in user in `added_by`.

| Command | What it does |
|---|---|
| `npm run dev` | Start the app with hot reload |
| `npm run lint` | Check and auto-fix code style problems. Run before every PR |
| `npm run format` | Tidy formatting with Prettier |
| `npm run build` | Production build into `dist/` |
| `npx playwright install chromium` | One-time: download the test browser |
| `npm run test:e2e` | Run the end-to-end tests in `tests/e2e/` |
| `npx playwright test --ui` | Same, but watch the tests run |

`npm run dev` also runs the serverless functions in `api/` (via `scripts/dev-api.js`), so `/api/route`, `/api/crowd` and `/api/places` work locally with no extra setup. On Vercel the same files run as real serverless functions.

## Live demo and test accounts

Live demo: [Open Fairpoint](https://fairpoint-wad2.vercel.app)

Email confirmation is enabled in Supabase for this demo. Users must register with a real email address and click the confirmation link before logging in.

Testers may create their own account using an accessible email address.

## Who owns what

One file = one owner. If you need to change someone else's file, ask them first or say so in your PR.

| Folder / file | Owner |
|---|---|
| `src/router/index.js`, `src/stores/hangout.js`, `src/App.vue` | Ryan |
| `src/styles/tokens.css`, `src/components/ui/` | Hugo |
| `src/views/` | One file per page, owner named at the top of each file |
| `src/components/map/`, `weather/` | Surya |
| `src/components/transport/`, `src/utils/midpoint.js` | Nicole |
| `src/components/heatmap/` | Ryan |
| `src/components/spots/` | Hugo |
| `src/components/voting/` | Eashvar |
| `src/components/preferences/`, `src/utils/matchScore.js`, `src/stores/auth.js` | Matrix |
| `src/services/` | Owner named at the top of each file |
| `api/route.js` Nicole · `api/crowd.js` Ryan · `api/places.js` Hugo | |
| `supabase/schema.sql` | Matrix |
| `tests/e2e/` | Eashvar sets up; everyone adds a spec for their journey |

## Pages

| # | Page | URL | View | Owner |
|---|---|---|---|---|
| 01 | Landing | `/` | `LandingView.vue` | Matrix |
| 02 | Log in / Sign up | `/login` | `AuthView.vue` | Matrix |
| 03 | Preferences | `/preferences` | `PreferencesView.vue` | Matrix |
| 04 | My hangouts | `/dashboard` | `DashboardView.vue` | Ryan |
| 05 | Create hangout & invite | `/hangouts/new` | `CreateHangoutView.vue` | Matrix |
| 06 | Starting points | `/hangouts/:id/start` | `StartingPointsView.vue` | Surya |
| 07 | Mode of transport | `/hangouts/:id/transport` | `TransportView.vue` | Nicole |
| 08 | Midpoint + heat map | `/hangouts/:id/midpoint` | `MidpointView.vue` | Ryan + Surya |
| 09 | Nearby spots | `/hangouts/:id/explore` | `ExploreView.vue` | Hugo |
| 10 | Spot details | `/hangouts/:id/spots/:spotId` | `SpotDetailsView.vue` | Hugo |
| 11 | Group voting | `/hangouts/:id/vote` | `VoteView.vue` | Eashvar |
| 12 | Final plan | `/hangouts/:id/plan` | `FinalPlanView.vue` | Eashvar (routes: Nicole) |

## Sample data

Everyone can build their page before the database and APIs are ready. There are two kinds of data, and both have samples:

| Kind | Real source | Sample until it's ready | Swap happens in |
|---|---|---|---|
| Saved: hangout, members, shortlist, votes | Supabase | `src/mocks/hangout.json` | `src/services/hangouts.js` (automatic once `.env.local` has Supabase keys) |
| Address search | OneMap Search | `src/mocks/addresses.json` (until `.env.local` has `ONEMAP_EMAIL` / `ONEMAP_PASSWORD`) | `api/search.js` |
| Weather + haze | data.gov.sg (NEA) + Open-Meteo | None needed: both are free with no key, so it's always real data | `src/services/weather.js` |
| Travel times | OneMap Routing | `api/_mocks/route.js` (estimates from distance) | `api/route.js` |
| Crowd levels | LTA DataMall | `api/_mocks/crowd.js` (busier at peak hours) | `api/crowd.js` |
| Nearby places | Google Places (`GOOGLE_PLACES_API_KEY`) | None; the API reports an error if the key is missing | `api/places.js` |
| Ask box on 09 ("prata for dinner") | Gemini (`GEMINI_API_KEY`) reads the request, then Google Places finds the spots | `api/_mocks/assistant.js` ("Sample spot 1–3", sample hangouts only) | `api/assistant.js` |

Pages call the service functions and never know which one they got. The nearby-spots API returns real results around the midpoint stored on the hangout. Other keyed APIs keep answering with samples when their key is missing from `.env.local`, so teammates without those keys can still work.

Sample responses are marked with "sample" in names and labels so they never get mistaken for real data in the demo.

## Rules

**Code**

1. Views never call `fetch` or `supabase` directly. Every API or database call lives in `src/services/`.
2. For the hangout being planned, use the Pinia store: `const store = useHangoutStore(); store.load(route.params.id)`.
3. Its shape is `src/mocks/hangout.json`. If you need a new field, change the mock and `supabase/schema.sql` in the same PR.

**CSS**

1. Bootstrap handles the grid, spacing and breakpoints.
2. `src/styles/tokens.css` is the only global CSS. Components use `<style scoped>` and `var(--fp-...)`. No hard-coded hex codes.
3. Nobody adds their own global CSS file.

**Keys**

1. `.env.local` is never committed (it's in `.gitignore`).
2. `VITE_` variables end up in the browser, so only the Supabase URL and publishable key go there.
3. Secret keys (OneMap, LTA, Google) have no `VITE_` prefix and are only used in `api/`.

**Git**

1. Never commit to `main`. Work on a branch like `feat/transport` and open a pull request. Your Vet-by partner reviews it before it's merged.
2. Pull `main` every day before you start.
3. Commit small and often. Keep each PR to one feature and merge it within 2 days.

```bash
git checkout main && git pull
git checkout -b feat/transport         # first time; later: git checkout feat/transport
# ...work...
npm run lint
git add .
git commit -m "Add mode selector to transport page"
git push -u origin feat/transport      # later pushes: git push
# open a PR on GitHub → partner reviews → merge
```

Hit a conflict or a scary error? Stop and ask in the group chat.

## Database

`supabase/schema.sql` is the source of truth. Matrix runs it once in Supabase → SQL Editor. After that, any change to the tables goes through a PR that edits this file.
