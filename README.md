# Fairpoint

Friends who live in different parts of Singapore waste time arguing about where to meet, and the person with the longest trip usually loses out. Fairpoint is for groups of friends planning a hangout: each person adds where they are coming from and how they will travel, Fairpoint finds the MRT station that is fairest for everyone, suggests nearby spots that suit the group, and the group votes on the final spot. A fair meeting point means nobody always makes the long trip, and the hangout gets planned in one place instead of a group chat.

Built for IS216 Web Application Development II. Team and page ownership: [CONTRIBUTORS.md](CONTRIBUTORS.md).

## Links

| | |
|---|---|
| Live app | https://fairpoint-wad2.vercel.app |
| GitHub | https://github.com/stack123321/WAD2 |
| Video | <<FILL: YouTube URL>> |

## Test accounts

Email confirmation is on in Supabase, so sign up needs a real inbox. Use these two accounts on the live app instead. Both are already confirmed.

| Account | Name | Email | Password | Role in the two-person test |
|---|---|---|---|---|
| 1 | tester1 | tester1@test.com | tester1@test | Host: creates the hangout and copies its invite link |
| 2 | tester2 | tester2@test.com | tester2@test | Invitee: opens the invite link and joins |

Running the app locally with no keys needs no account: the demo hangout at `/hangouts/demo/midpoint` (and the other pages under `/hangouts/demo/`) uses sample data.

## Pages

Every route in [src/router/index.js](src/router/index.js). Pages 01–12 are the Figma frames; the rest were added later. Everything except the landing and login pages needs a login.

| # | Page | URL | View |
|---|---|---|---|
| 01 | Landing | `/` | `LandingView.vue` |
| 02 | Log in / Sign up | `/login` | `AuthView.vue` |
| 03 | Preferences (activities, diet, budget, rain, step-free) | `/preferences` | `PreferencesView.vue` |
| 04 | My hangouts (each hangout's next step) | `/dashboard` | `DashboardView.vue` |
|  | Crowds (heat map of all MRT stations; open by typing the URL) | `/crowds` | `CrowdsView.vue` |
|  | Friends (search, requests, my friends) | `/friends` | `FriendsView.vue` |
|  | My chats | `/chats` | `MyChatsView.vue` |
|  | Hangout chat | `/chats/:hangoutId` | `ChatView.vue` |
|  | One-to-one chat | `/chats/direct/:chatId` | `DirectChatView.vue` |
|  | New friend group | `/groups/new` | `NewGroupView.vue` |
|  | Friend group (its hangouts, chat and usual starting points) | `/groups/:groupId` | `GroupView.vue` |
| 05 | Create hangout and invite | `/hangouts/new` | `CreateHangoutView.vue` |
|  | Edit hangout details | `/hangouts/:id/edit` | `CreateHangoutView.vue` |
| 06 | Starting points | `/hangouts/:id/start` | `StartingPointsView.vue` |
| 07 | Mode of transport | `/hangouts/:id/transport` | `TransportView.vue` |
| 08 | Midpoint, crowds and weather | `/hangouts/:id/midpoint` | `MidpointView.vue` |
| 09 | Nearby spots | `/hangouts/:id/explore` | `ExploreView.vue` |
| 10 | Spot details | `/hangouts/:id/spots/:spotId` | `SpotDetailsView.vue` |
| 11 | Group voting | `/hangouts/:id/vote` | `VoteView.vue` |
| 12 | Final plan | `/hangouts/:id/plan` | `FinalPlanView.vue` |
|  | Debrief (after the hangout) | `/hangouts/:id/debrief` | `DebriefView.vue` |

## How this project meets the brief

| Requirement | Where |
|---|---|
| HTML, CSS, JavaScript, a framework | Vue 3 single-file components in `src/views/` and `src/components/`, built with Vite. Vue Router for the pages, Pinia for the hangout, login and alert stores. |
| CSS framework | Bootstrap 5 for the grid, spacing and breakpoints. Colours, radius and fonts are tokens in `src/assets/tokens.css`; components use `<style scoped>`. |
| Responsive design | Bootstrap's breakpoints (576, 768, 992 and 1200 px). A script check at 375 px (iPhone 6) found no sideways scrolling on any page. |
| Data store | Supabase: Postgres (14 tables, row level security on every one), Auth (email and password), Realtime (votes, members, chat) and Storage (private bucket for hangout photos). See [Database](#database). |
| External APIs, called asynchronously | See the table below. |
| Tests | Vitest unit and component tests (197, in `__tests__` folders next to the code) and Playwright end-to-end tests (105, one per user journey, in `tests/e2e/`). See [Running the tests](#running-the-tests). |

Tables: `profiles`, `hangouts`, `hangout_members`, `shortlist`, `votes`, `friendships`, `messages`, `groups`, `group_members`, `group_messages`, `direct_chats`, `direct_messages`, `chat_reads`, `hangout_photos`.

### External APIs

Secret keys stay on the server: every API that needs a key is called through our own `/api/...` functions (Vercel serverless functions in `api/`). The ones with no key (weather, public holidays and the map tiles) are called straight from the browser.

| API | What it does for the user | Called from | Key | Caching and limits |
|---|---|---|---|---|
| OneMap Search | Finds the address, MRT station or postal code a friend types on 06 | `api/search.js` | `ONEMAP_EMAIL`, `ONEMAP_PASSWORD` | Token is reused until it expires |
| OneMap Reverse Geocode | Names the place when a friend drags their pin on 06 or uses their current location | `api/reverse.js` | same | |
| OneMap Routing | Travel time, fare and steps for each person, by MRT, bus, car or walking (07, 08) | `api/route.js` | same | Answers are kept in memory so repeat requests do not call OneMap again |
| OneMap map tiles | The base map on 06, 08 and `/crowds`, with OneMap's required credit shown on the map | `src/utils/mapSetup.js` | none | |
| LTA DataMall | Crowd level at each MRT station (live platform crowd, or the forecast), and car park rates for the parking cost | `api/crowd.js`, `api/_parking.js` | `LTA_ACCOUNT_KEY` | Cached per line for 10 minutes (live) or 30 minutes (forecast) |
| NEA via data.gov.sg and Open-Meteo | Weather, rain chance and haze for the hangout's time and place (04, 08, 12) | `src/services/weather.js` | none | |
| data.gov.sg public holidays | Warns on 10 when the hangout falls on a public holiday, as opening hours may differ | `src/services/holidays.js` | none | Each year's list is fetched once per visit |
| Google Places (New) | Nearby cafes, restaurants and activities, photos, and a short summary (09, 10) | `api/places.js`, `api/place-photo.js` | `GOOGLE_PLACES_API_KEY` | The Google project allows 100 nearby searches a day, and each category on 09 counts as one. Vercel's CDN keeps each nearby search for an hour, so the same meeting point reuses it. Photos are cacheable for an hour |
| Gemini | The Ask box on 09: turns "prata for dinner, one of us is halal" into a search. It never names places, Google Places finds them. | `api/assistant.js`, `api/_gemini.js` | `GEMINI_API_KEY` | |

### The algorithm

**Fair midpoint** ([src/utils/midpoint.js](src/utils/midpoint.js), [src/services/routing.js](src/services/routing.js))

1. Take everyone's starting point and find their plain geographic centre (`centroid`).
2. Take the 8 MRT stations closest to that centre (`nearestStations`).
3. For each of the 8, ask OneMap for every person's travel time and cost, using each person's own mode of transport.
4. Score each station with `fairness()`: the longest trip, and the gap between the longest and the shortest trip.
5. `rankAreas()` sorts the stations. The default, "fairest", scores `longest + gap`, so a station wins by keeping the longest trip short and the trips close together. "Fastest" scores the average time, and "cheapest" scores the total cost. The lowest score wins, and a tie goes to the lower average time.

On 08 the group can drag the pin; it snaps to the nearest station and the same travel times and fairness numbers are worked out for it.

**Spot match score** ([src/utils/matchScore.js](src/utils/matchScore.js)), the percentage on each spot card on 09 and in the criteria list on 10:

- *Hard vetoes, score 0:* closed at any point during the hangout (opening hours checked every 15 minutes), not step-free when a member needs step-free, or outdoors when rain is forecast and a member prefers indoors in the rain.
- *Base score out of 100:* hangout vibe matches the place (34), share of members whose favourite activities match the place (17), how highly the place's type ranks in each member's past votes (16), and share of members whose budget covers the price level (33), plus up to 5 when the place mentions a member's dietary need (for example halal). Unknown prices and budgets do not penalise, and the score never goes above 100.
- *Soft penalties:* every 7 minutes of walking from the midpoint takes 10% off (never below 20% of the score), and closing within an hour of the start or end halves the score. If members set a maximum travel time, the score drops by up to 30% depending on how many of them would go over it, and if anyone prefers to avoid crowds and the station will be busy, it drops by 30%.

### Without any keys

The app still runs. Each service falls back to sample data when its key is missing, and sample answers are labelled "sample" so they are never mistaken for real data.

| Data | Real source | With no key |
|---|---|---|
| Hangouts, members, shortlist, votes | Supabase | `src/mocks/hangout.json` and `hangout-collecting.json` (the demo hangouts) |
| Address search | OneMap | `src/mocks/addresses.json` |
| Travel times | OneMap Routing | `api/_mocks/route.js` (estimates from distance) |
| Crowd levels | LTA DataMall | `api/_mocks/crowd.js` (busier at peak hours) |
| Weather and haze | NEA, Open-Meteo | none needed, both are free with no key |
| Nearby spots | Google Places | none: 09 and 10 need a Google key and show an error without one |

## Setup

You need Node 22.18 or newer (`node -v` to check).

**From the submitted zip.** The zip includes `.env.local` with every key, so the app uses the real database and APIs. Don't copy `.env.example` over it.

```bash
cd <the unzipped folder>
npm install
npm run dev                   # http://localhost:5173 opens the landing page
```

**From GitHub.** The repository has no keys, so copy the `.env.local` from the submitted zip into the cloned folder. Without it, the app runs on the demo data (see [Without any keys](#without-any-keys)).

```bash
git clone https://github.com/stack123321/WAD2.git
cd WAD2
npm install
cp <the unzipped folder>/.env.local .    # the keys from the zip
npm run dev
```

`npm run dev` also runs the functions in `api/` (through `scripts/devApi.js`), so `/api/route`, `/api/crowd` and the rest work locally. On Vercel the same files run as serverless functions.

| Key in `.env.local` | Needed? | What it unlocks |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Optional | Real accounts and data. The code also accepts the older name `VITE_SUPABASE_ANON_KEY`. Without them the app uses the demo hangouts. |
| `ONEMAP_EMAIL`, `ONEMAP_PASSWORD` | Optional | Real address search and travel times |
| `LTA_ACCOUNT_KEY` | Optional | Real crowd levels and parking rates |
| `GOOGLE_PLACES_API_KEY` | Optional | Nearby spots on 09 and 10 |
| `GEMINI_API_KEY` | Optional | The Ask box on 09 |
| `E2E_EMAIL`, `E2E_PASSWORD`, `E2E_EMAIL_2`, `E2E_PASSWORD_2` | Live tests only | Two real test accounts for `npm run test:live` |

Only the two `VITE_` values are sent to the browser. Every other key has no `VITE_` prefix and is used only inside `api/`.

| Command | What it does |
|---|---|
| `npm run dev` | Start the app with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run lint` | Check and auto-fix code style |
| `npm run format` | Tidy formatting with Prettier |
| `npm run test:unit` | Run the unit and component tests (see below) |
| `npm run test:e2e` | Run the end-to-end tests (see below) |
| `npm run test:live` | Run the optional live tests |

## Running the tests

Testing follows the course's three kinds (Week 10): unit tests for plain functions and component tests for Vue components, both with Vitest, and one end-to-end test per user journey with Playwright.

The tests need no keys and no account. The end-to-end tests start their own copy of the app on port 5198 with every key blanked, so the app uses the demo hangouts and the functions' sample data (routes, place search, the Ask box), and the tests answer the Google Places calls themselves.

```bash
npm run test:unit                  # Vitest: unit and component tests, next to the code in __tests__ folders
npx playwright install chromium    # once, downloads the test browser
npm run test:e2e                   # Playwright: the end-to-end tests in tests/e2e/
```

Expected result: no failures. Both kinds of test run on GitHub for every pull request ([.github/workflows/tests.yml](.github/workflows/tests.yml)), together with lint and the build.

| Command | What it does |
|---|---|
| `npx playwright show-report` | Open the HTML report from the last end-to-end run |
| `npx playwright test tests/e2e/smoke.spec.js` | Run one end-to-end spec |
| `npx playwright test -g "pinned"` | Run the end-to-end tests whose name contains some text |
| `npx playwright test --ui` | Watch the end-to-end tests run |
| `npx vitest` | Vitest in watch mode while you edit |

`npm run test:live` runs `tests/live/` against the real Supabase project. It is optional and needs real accounts in `.env.local` (`E2E_EMAIL` and so on). It is not part of the normal run.

**How the tests are built.**

- **Three layers, each proving something different.** Unit tests check the logic with no screen: the fair-midpoint algorithm, the match score, counting votes, dates. Component tests mount one Vue component and check what it shows and what it emits. An integration test ([IntegrationTest.spec.js](src/components/voting/__tests__/IntegrationTest.spec.js)) mounts the real vote list with its real cards, to check they work together. End-to-end tests click through a whole journey in a real browser. Most checks sit in the fast lower layers; the end-to-end tests cover what only a full page can show.
- **Repeatable.** Every run uses the same sample hangouts, a clock fixed in October 2026 ([helpers/clock.js](tests/e2e/helpers/clock.js)) and fake Google Places answers ([helpers/places.js](tests/e2e/helpers/places.js)). Nothing depends on today's date, the network or another test, and each test starts on a fresh page. The live tests delete what they create.
- **Stable selectors.** Tests find things the way a person does: by role and name (`getByRole('button', { name: 'Close vote' })`), by label or by visible text, never by CSS classes or layout. Restyling a page doesn't break them, and a failing test means something a user would notice is broken.
- **One behaviour per test, named after it.** Vitest tests are `TestSuite:` / `TestN:`, Playwright tests are a plain sentence such as "the host closes the vote and the final plan shows the winner". Each file starts with a header saying who owns it and what it covers.
- **Tests that can fail.** While writing them, we checked tests by deliberately breaking the code they cover and making sure they fail, so a pass means the feature works.
- **Run on every change.** GitHub runs lint, the build and both kinds of test on every pull request. Failed end-to-end tests are retried only there, as a safety net. Locally at most four run at once, so a busy laptop doesn't time out.

**End-to-end tests** (`tests/e2e/`), each one a user journey on the demo hangouts:

| Spec | Journey |
|---|---|
| `smoke.spec.js` | Every page opens with the right heading; a new hangout from the landing page to the final plan; sign up to My hangouts |
| `landing.spec.js` | 01: the hero button starts a hangout; "How it works" and the FAQ |
| `auth.spec.js`, `signupNext.spec.js` | 02: log in and sign up say what is missing; logging in opens My hangouts; signing up on the way to another page goes through the setup first |
| `preferences.spec.js`, `deleteAccount.spec.js` | 03: saving preferences; the setup steps after sign up; Delete my account |
| `dashboard.spec.js` | 04: both hangouts and their progress; a card opens its next step; pinning |
| `createHangout.spec.js` | 05: Create says what is missing; creating opens 06 |
| `hangoutDetails.spec.js` | The step bar's Details: editing a hangout's details |
| `startingPoints.spec.js` | 06: everyone's starting point; search and pick a place; no match |
| `transport.spec.js` | 07: everyone's mode; Find our midpoint opens 08 |
| `midpoint.spec.js`, `crowds.spec.js` | 08 and `/crowds`: the time slider; See nearby spots |
| `explore.spec.js` | 09: spots near the midpoint; Filters; adding a spot to the shortlist; opening a spot; on a phone, the menu and the swipeable cards |
| `assistant.spec.js` | 09: the Ask box, and Reset; on a phone, the Ask button |
| `spotDetails.spec.js` | 10: details; the photos; each friend's travel time; Add to Vote and Remove; back to 09 |
| `voting.spec.js` | 11 and 12: start the vote, change a vote, someone outside the hangout can't vote; the tie-break wheel stays locked until a tie, and the host spins it; close the vote; the final plan shows the winner, how fair the trips are, and Mark as done |
| `debrief.spec.js`, `pastHangouts.spec.js` | After the hangout: the debrief, "Plan another with this group", Go again |
| `friends.spec.js`, `chats.spec.js`, `groups.spec.js` | Friends and requests, chats, switching between hangouts |
| `chatPopover.spec.js` | The 💬 group chat opening over a step and closing (✕, Esc, the button), on a laptop and a phone |
| `friendGroups.spec.js` | Friend groups: My Chats, a group's page, usual starting points, planning with a group, adding and removing people, on a phone |

**Unit and component tests** (`src/**/__tests__/` and `api/__tests__/`): the fair-midpoint algorithm (fairness, ranking, times per person), the match score, the voting helpers, dates, hangout status, avatar colours, vibes, weather, "Go again", friend groups' usual starting points and Google's error messages, and the voting, transport, spot and weather components.

**What goes beyond the course.** Everything else uses only what Week 10 covers. These few extras are each needed for one thing, and each is in one place with a comment saying why:

| Extra | Where | Why it's needed |
|---|---|---|
| A fixed date and time (`page.clock`) | `tests/e2e/helpers/clock.js` | The demo hangouts are dated October 2026; without it, voting and the countdowns would always show as over |
| Fake Google Places answers (`page.route`) | `tests/e2e/helpers/places.js`, `tests/live/helpers.js` | Nearby spots are the only API with no sample data without a key |
| A phone-sized screen (`page.setViewportSize`) | `tests/e2e/helpers/phone.js` | 09 and the chat work differently on a phone |
| Pressing Esc (`page.keyboard.press`) | `tests/e2e/chatPopover.spec.js` | Esc closing the chat is the behaviour being tested |
| Two people at once (`browser.newContext`), reading the invite link (clipboard) | `tests/live/` | The two-person live test needs two logged-in browsers, and the app only copies the link |

Small extensions of what the course shows, used where they read more clearly: the Vitest matchers `toBeGreaterThanOrEqual` and `toContainEqual`; Playwright checks such as `toBeHidden`, `toContainText`, `toHaveCount`, `toBeDisabled`, `toBeEnabled`, `toBeChecked`, `toHaveAttribute` and `toHaveValue`; `getByLabel` for fields with no role; `getByRole` options (`exact`, `level`, `disabled`, `pressed`); `.filter({ hasText })`, `.first()`, `.last()` and `.nth()` to pick one card or row; and `hover()`.

## AI and LLM usage

The brief allows AI for lower-order work: information search, website concepts and UI inspiration, explaining coding errors and debugging hints, boilerplate code, and unit test cases, sample inputs and mock data. It does not allow AI for core implementation (main business logic, backend endpoints, critical frontend interactivity) or problem solving. Each member's line below says what they used AI for.

**Parts that relied solely on AI:** the Supabase SQL (the tables, row level security policies and database functions). It isn't in this repository; see [Database](#database).

**Eashvar:** I used AI to explain errors and how to call Gemini (the Ask box) and Supabase (votes).

**Hugo:** I used AI to explain errors and how to call Google Places (`/api/places`).

**Matrix:** AI wrote the Supabase SQL (above). I used AI to explain errors and how to call Supabase for log in, preferences and hangouts.

**Nicole:** I used AI to explain errors and how to call OneMap Routing (`/api/route`).

**Ryan:** I used Claude to explain errors and how to call LTA DataMall (`/api/crowd`) and Supabase (friends and chats), to tidy the repository and README before submission, and for small fixes I reviewed (a cache header, the phone step bar, a live test).

**Surya:** I used AI to explain errors and how to call OneMap search and reverse geocoding (`/api/search`, `/api/reverse`).

## Credits

Libraries (all in `package.json`):

| Library | Used for | Link |
|---|---|---|
| Vue 3 | Components and reactivity | https://vuejs.org |
| Vue Router | Pages and navigation | https://router.vuejs.org |
| Pinia | Shared state (hangout, login, alerts) | https://pinia.vuejs.org |
| Bootstrap 5 | Grid, spacing, buttons and forms | https://getbootstrap.com |
| Leaflet | The maps | https://leafletjs.com |
| Supabase JS | Database, login, realtime and storage | https://supabase.com/docs/reference/javascript |
| axios | HTTP calls, from the services in `src/services/`, the `api/` functions and scripts | https://axios-http.com |
| Plus Jakarta Sans | The app's font, loaded from Google Fonts | https://fonts.google.com/specimen/Plus+Jakarta+Sans |

Build and test tools: Vite, Vitest with Vue Test Utils, Playwright, ESLint, oxlint and Prettier.

Data and APIs: [OneMap](https://www.onemap.gov.sg/apidocs/) (search, reverse geocoding, routing and map tiles, © Singapore Land Authority and contributors), [LTA DataMall](https://datamall.lta.gov.sg) (station crowd levels and car parks), [data.gov.sg](https://data.gov.sg) (NEA weather and haze, public holidays, and the mall car park rates in `api/_data/carparkRates.js`, from 2018), [Open-Meteo](https://open-meteo.com) (weather forecast), [Google Places API (New)](https://developers.google.com/maps/documentation/places/web-service) (nearby places, photos and summaries) and [Gemini](https://ai.google.dev) (the Ask box).

## Project structure

```
api/             Vercel serverless functions, one file per /api/... URL. Files starting with _ are helpers.
  _data/         Station positions and mall car park rates
  _mocks/        Sample answers used when a key is missing
scripts/         devApi.js (runs api/ during npm run dev), buildCarparkRates.js (one-time data script)
src/              (a __tests__/ folder next to the code holds its Vitest tests)
  views/         One file per page
  components/    Page parts, grouped by feature (dashboard, map, spots, voting, ...)
    shared/      Parts used by several pages (trip table, spot hero)
    chat/        The chat box and the chat pop-up on the hangout steps
  composables/   Small reusable Vue helpers
  services/      Every call to an API or to Supabase
  stores/        Pinia stores: auth, hangout, alerts
  utils/         Plain functions with no Vue: midpoint.js, matchScore.js, voteHelpers.js, dates, status, and mapSetup.js (the Leaflet map)
  mocks/         Sample hangouts, addresses and place types
  router/        All routes, and the login redirect
  assets/        tokens.css, the only global CSS
tests/
  e2e/           The end-to-end Playwright tests (npm run test:e2e)
  live/          Optional tests against the real Supabase project
.github/         Workflows (tests on every pull request, deploy to Vercel on main) and the pull request template
```

Conventions:

- Services own every API and database call. Views and components never call `fetch` or Supabase directly.
- Secret keys have no `VITE_` prefix and are used only in `api/`. The Supabase service-role key is never in the front end, and `.env.local` is never committed.
- Colours, radius and shadows come from `var(--fp-...)` tokens in `src/assets/tokens.css`. Components use `<style scoped>`. The one exception is `src/utils/palette.js`, for colours that JavaScript has to hold itself (the avatar colours and the Leaflet map shapes).
- Components are `PascalCase.vue`, JavaScript modules in `src/` are `camelCase.js`, and files in `api/` are `kebab-case.js` because each one is a URL.

## Database

The database is hosted on Supabase (Postgres, Auth, Realtime and Storage). Its SQL (tables, row level security policies, database functions, the storage bucket and the realtime setup) is not included in this repository, so the database can't be recreated from these files. To see the app with real data, use the [live app](https://fairpoint-wad2.vercel.app) and the [test accounts](#test-accounts), or run the submitted zip, whose `.env.local` points at the same database. Without Supabase keys, the app uses the demo hangouts instead (see [Without any keys](#without-any-keys)).

## Known limitations

- The Google project allows only 100 nearby searches a day (each category on 09 counts as one). Each search is reused for an hour per meeting point, but once the day's quota is used up, 09 and 10 show an error until it resets, and without Google they have no spots.
- "Sort: Crowd level" on 09 has no effect yet: every spot shares the midpoint station's crowd level, so it can't reorder them.
- Page 10 shows placeholder text ("Photo / map preview", "Description and details.") when no spot has loaded, for example when Google Places can't be reached.
- Free Supabase projects pause after 7 idle days. A GitHub Action ([.github/workflows/keep-alive.yml](.github/workflows/keep-alive.yml)) pings the database every 3 days to keep it awake.
