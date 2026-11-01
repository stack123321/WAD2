# Beyond the syllabus

Functions and techniques used in Fairpoint that the IS216 WAD2 course folder doesn't teach (Weeks 1–6 plus the WAD1 recap, checked by searching the course code). Each entry says what it does, shows a small example, and links to where we use it.

"Seen" means it appears in course-provided code but isn't explained in the lessons.

## Dates and time

### `date.getTime()`
Turns a `Date` into a plain number: milliseconds since 1 Jan 1970 (UTC). Numbers are easy to compare and do maths on; `Date` objects aren't.
```js
const at = new Date('2026-10-08T19:00:00+08:00')
at.getTime() // 1791457200000
```
Used in: [api/crowd.js](../api/crowd.js) to check whether a time falls inside a 30-minute forecast slot.

### `Date.now()`
The current time as that same millisecond number. It's a shortcut for `new Date().getTime()`. (Seen once in the course code.)
```js
const ageMs = Date.now() - at.getTime() // how long ago `at` was, in ms
```
Used in: [api/crowd.js](../api/crowd.js) to decide whether `at` means "now".

### `date.toISOString()`
Turns a `Date` into standard text, always in UTC (the `Z` at the end means UTC). Use it to send a date to a server, because `new Date(text)` on the other side reads it back exactly.
```js
new Date().toISOString() // "2026-10-08T03:00:00.000Z"
```
Used in: [src/services/crowd.js](../src/services/crowd.js) to put the heatmap's time into `?at=`.

### `date.getHours()` and `date.getMinutes()`
Read the hour (0–23) and minute (0–59) of a `Date`, in the browser's own time zone.
```js
const now = new Date() // 6:42 pm
now.getHours() // 18
now.getMinutes() // 42
```
Used in: [CrowdHeatmap.vue](../src/components/heatmap/CrowdHeatmap.vue) to start the slider at the current half hour.

### `date.setHours(hours, minutes, seconds, ms)`
Changes the time of an existing `Date` but keeps its day. Pass all four numbers to land exactly on the minute.
```js
const date = new Date() // today, some time
date.setHours(18, 30, 0, 0) // today at 6:30:00.000 pm
```
Used in: [CrowdHeatmap.vue](../src/components/heatmap/CrowdHeatmap.vue) to turn a slider position into a time today.

### `date.toLocaleDateString(locale, options)` and `date.toLocaleTimeString(locale, options)`
Turn a `Date` into readable text. The course uses `toLocaleTimeString()` with no options (Week 5 `Example12.vue`); passing options picks exactly which parts you get. `timeZone` makes it show Singapore time even on a laptop set to another time zone.
```js
const d = new Date('2026-10-16T19:00:00+08:00')
const SG = 'Asia/Singapore'
d.toLocaleDateString('en-SG', { weekday: 'short', timeZone: SG }) // "Fri"
d.toLocaleDateString('en-SG', { day: 'numeric', timeZone: SG }) // "16"
d.toLocaleDateString('en-SG', { month: 'short', timeZone: SG }) // "Oct"
d.toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit', timeZone: SG }) // "7:00 pm"
```
Used in: [HangoutCard.vue](../src/components/dashboard/HangoutCard.vue) for the date block and start time.

## Lists

### `list.sort((a, b) => b.x - a.x)`
Puts a list in order, **changing the list itself**. The function compares two items: a negative answer puts `a` first, a positive one puts `b` first. So `a.x - b.x` sorts smallest first, and `b.x - a.x` sorts biggest (or newest) first. (Seen in the course code, but not explained.)
```js
const friends = [{ name: 'Hugo', met: 100 }, { name: 'Matrix', met: 300 }, { name: 'Eashvar', met: 200 }]
friends.sort((a, b) => b.met - a.met) // Matrix (300), Eashvar (200), Hugo (100)
```
Used in: [services/friends.js](../src/services/friends.js) to put the newest friends first.

### `list.slice(start, end)`
A **copy** of part of a list, from `start` up to (not including) `end`. The original list isn't changed. (Seen in the course code, but not explained.)
```js
['Matrix', 'Eashvar', 'Hugo', 'Nicole'].slice(0, 3) // ['Matrix', 'Eashvar', 'Hugo']
[1, 2].slice() // [1, 2]: with no numbers, a copy of the whole list
```
Used in: [services/friends.js](../src/services/friends.js) to keep the 3 newest friends, and [PreferencesView.vue](../src/views/PreferencesView.vue) to copy the default lists on Reset.

## Text

### `text.includes(part)`
`true` if `part` appears anywhere inside `text`. Capitals matter: `'Bishan'.includes('bishan')` is `false`.
```js
'Bishan (sample)'.includes('(sample)') // true
'Bishan'.includes('(sample)') // false
```
Used in: [CrowdHeatmap.vue](../src/components/heatmap/CrowdHeatmap.vue) and [CrowdsNow.vue](../src/components/heatmap/CrowdsNow.vue) to tell when api/crowd.js sent sample data because LTA was unavailable.

## Maths

### `Math.abs(n)`
The absolute value: removes the minus sign. Use it when you care how far apart two numbers are, not which one is bigger.
```js
Math.abs(-5) // 5
Math.abs(at.getTime() - Date.now()) < 30 * 60 * 1000 // within 30 min, before or after now
```
Used in: [api/crowd.js](../api/crowd.js).

## Leaflet (maps)

Leaflet is the library that draws an interactive map (drag, zoom, hover) inside a `<div>`. It's imported as `L`, plus its CSS:
```js
import L from 'leaflet'
import 'leaflet/dist/leaflet.css' // without this the map tiles end up scattered
```
All of these are used in [CrowdHeatmap.vue](../src/components/heatmap/CrowdHeatmap.vue).

### `L.map(id).setView([lat, lng], zoom)`
Turns the `<div>` with that id into a map, then centres it. Zoom 11 shows the whole of Singapore; bigger numbers zoom in. It must run in `onMounted`, because before that the `<div>` doesn't exist yet.
```js
const map = L.map('crowd-map').setView([1.3521, 103.8198], 11)
```

### `L.tileLayer(url, { attribution }).addTo(map)`
Loads the map pictures ("tiles"). We use OneMap's free Singapore map (`https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png`), the same as every other map in the app. `{z}/{x}/{y}` in the URL are filled in by Leaflet for each square of the map. OneMap's terms say you must show the `attribution` credit.

### `L.circleMarker([lat, lng], { radius, className })`
Draws a circle at a position. `radius` is in screen pixels, so it stays the same size when you zoom. `className` adds CSS classes so the stylesheet can colour it.

### `.bindTooltip(text)`
Shows `text` in a small label when you hover over a shape.

### `.addTo(mapOrGroup)`
Puts a shape (or a tile layer or group) onto the map, or into a group. Shapes aren't visible until they're added.

### `L.layerGroup()` and `group.clearLayers()`
A container for many shapes. Add circles to the group instead of straight onto the map; then `clearLayers()` removes all of them in one call, ready to draw the next time slot.
```js
const circles = L.layerGroup().addTo(map)
circles.clearLayers() // remove every circle in the group
```

### `map.fitBounds(points, { padding, maxZoom })`
Moves and zooms the map so every point in the list fits on screen. `padding` keeps them away from the edges (in pixels); `maxZoom` stops it zooming in too far when the points are close together.
```js
map.fitBounds([[1.35, 103.94], [1.33, 103.74], [1.35, 103.85]], { padding: [40, 40], maxZoom: 14 })
```
Used in: [CrowdHeatmap.vue](../src/components/heatmap/CrowdHeatmap.vue) to show the midpoint and everyone's starting points together on 08.

## Browser features

### `new ResizeObserver(callback)` and `.observe(element)`
Calls `callback` whenever the element changes size, e.g. when the window is resized. Leaflet measures its box only once, so without this part of the map stays grey after the layout changes. `.disconnect()` stops watching (do it when leaving the page).
```js
const watcher = new ResizeObserver(() => map.invalidateSize()) // "measure your box again"
watcher.observe(document.getElementById('crowd-map'))
```
Used in: [CrowdHeatmap.vue](../src/components/heatmap/CrowdHeatmap.vue), copied from Surya's [MembersMap.vue](../src/components/map/MembersMap.vue) on 06.

### `setTimeout(fn, ms)`
Runs `fn` once after `ms` milliseconds. "Seen": it appears in the lab-test snippets but isn't explained. We use it to wait one beat before starting a CSS transition, and to pause during the tie-break wheel.
```js
setTimeout(() => (entered.value = true), 20) // let the page paint first, then fade it in
```
Used in: [PageDrop.vue](../src/components/ui/PageDrop.vue), [VoteView.vue](../src/views/VoteView.vue).

### `Promise.all([...])`
Starts several requests at the same time and waits until all of them are done, instead of waiting for one before starting the next. The result is a list in the same order.
```js
const routes = await Promise.all(people.map((person) => getRoute(person, midpoint)))
```
Used in: [routing.js](../src/services/routing.js).

### `new AbortController()`
Lets us cancel a request that is no longer wanted, for example when the user opens another spot before the first one has loaded. `controller.abort()` cancels it and `controller.signal` is passed to the request.
```js
const controller = new AbortController()
onCleanup(() => controller.abort()) // watch() calls this before running again
```
Used in: [SpotDetailsView.vue](../src/views/SpotDetailsView.vue), [ExploreView.vue](../src/views/ExploreView.vue).

### `window.matchMedia(query)`
Asks the browser whether a CSS media query matches right now, from JavaScript. We use it to know when the screen is phone-sized so the page can show a different layout.
```js
const mql = window.matchMedia('(max-width: 767px)') // mql.matches is true or false
```
Used in: [useMediaQuery.js](../src/composables/useMediaQuery.js).

### `navigator.clipboard.writeText(text)` and `navigator.geolocation.getCurrentPosition(...)`
Two browser features: copying text to the clipboard (the invite link) and asking for the user's location (the "Use my current location" button). The browser asks the user for permission for location.
```js
await navigator.clipboard.writeText(link)
navigator.geolocation.getCurrentPosition(onLocationFound, onLocationError)
```
Used in: [HangoutBar.vue](../src/components/hangout/HangoutBar.vue), [PlaceSearch.vue](../src/components/map/PlaceSearch.vue).

## CSS

### `:deep(.class)` in `<style scoped>`
Scoped styles only reach elements Vue made in this component's template. Elements made by a library (here, Leaflet's circles) don't get Vue's hidden scope attribute, so a normal scoped rule misses them. Wrapping the selector in `:deep()` makes the rule reach them, while still only applying inside this component.
```css
:deep(.crowd-h) {
  fill: var(--bs-danger);
}
```
Used in: [CrowdHeatmap.vue](../src/components/heatmap/CrowdHeatmap.vue).

### `.a + .a` (adjacent sibling selector)
Selects an element that comes straight after another one, inside the same parent. `.avatar + .avatar` matches every avatar except the first, which is handy for spacing "between" items.
```css
.avatar + .avatar {
  margin-left: -8px; /* each circle tucks under the one before it */
}
```
Used in: [HangoutCard.vue](../src/components/dashboard/HangoutCard.vue) for the overlapping member circles.

### `var(--name)` and `:root { --name: value }` (CSS custom properties)
Gives a value a name once, then uses it everywhere. "Seen": the Vue starter project we were given (`base.css`) defines its palette this way. Ours is `src/styles/tokens.css`, so the teal, radius and shadow are written in one place and every page matches.
```css
:root { --fp-primary: #0e7c6b; }
.btn-save { background: var(--fp-primary); }
```
Used in: [tokens.css](../src/styles/tokens.css) and almost every component.

### `color-mix(in srgb, colour percent, colour)`
Mixes two colours, for example 10% teal into white to get a pale teal without picking another hex code. Only "seen" in the lab-test snippets.
```css
background: color-mix(in srgb, var(--fp-primary) 10%, var(--fp-surface));
```
Used in: [SpotHero.vue](../src/components/shared/SpotHero.vue), [VoteResults.vue](../src/components/voting/VoteResults.vue), [HangoutChat.vue](../src/components/chat/HangoutChat.vue).

### `:not(.class)`
Selects elements that do not match. Here: every item in a stack except the first, which gets the gap above it.
```css
.stack > :not(:first-child) { margin-top: 0.75rem; }
```
Used in: [VoteResults.vue](../src/components/voting/VoteResults.vue), [CandidateCard.vue](../src/components/voting/CandidateCard.vue), [VoteView.vue](../src/views/VoteView.vue), and the Landing FAQ.

### `aspect-ratio: 16 / 9`
Keeps a box at a fixed width-to-height shape, so a photo area keeps its shape while the card resizes.
Used in: [SpotCard.vue](../src/components/spots/SpotCard.vue), [HangoutPhotos.vue](../src/components/debrief/HangoutPhotos.vue).

### `100dvh` and `env(safe-area-inset-bottom)`
`dvh` is the screen height that excludes a phone browser's moving address bar, so a full-height page doesn't get cut off. `env(safe-area-inset-bottom)` is the space a phone keeps free at the bottom (the home bar), so the tab bar isn't covered.
```css
height: calc(100dvh - 57px - 108px); /* screen minus the navbar and the hangout bar */
padding-bottom: calc(0.5rem + env(safe-area-inset-bottom, 0px));
```
Used in: [ExploreView.vue](../src/views/ExploreView.vue), [NavBar.vue](../src/components/ui/NavBar.vue), [tokens.css](../src/styles/tokens.css).

## Vue

### `defineExpose({ ... })`
In `<script setup>` a component's functions are private. `defineExpose` lets the parent call one through a template ref, here so the page can switch the spot tab from outside.
```js
defineExpose({ selectTab })
```
Used in: [MidpointSpots.vue](../src/components/midpoint/MidpointSpots.vue).

## Vue Router

### `router.beforeEach((to) => ...)` and route `meta`
A **navigation guard**: a function the router runs before *every* page change, including the first page load. What it returns decides what happens: returning nothing (or `true`) lets the page open; a route like `{ name: 'auth' }` sends the user there instead. `to` is the page they're trying to open, and `to.meta` is whatever you put in that route's `meta: { ... }`.
```js
// in the routes list
{ path: '/dashboard', name: 'dashboard', component: DashboardView, meta: { requiresAuth: true } }

// after createRouter
router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true // public page
  if (await isLoggedIn()) return true
  return { name: 'auth', query: { redirect: to.fullPath } } // log in, then come back
})
```
`to.fullPath` is the whole address including `?query`, so after logging in the user lands exactly where they were going.

Used in: [router/index.js](../src/router/index.js) for the login guard.

### Waiting for something: `new Promise` + `watch`
After a page refresh, the auth store takes a moment to hear back from Supabase (`auth.ready` turns `true`). The guard has to wait for that, or a logged-in user would be sent to the login page by mistake.

- **`watch(() => value, (newValue) => { ... })`** (Vue) runs the second function every time the first one's result changes. It returns a function, here called `stop`, that switches the watching off.
- **`new Promise((resolve) => { ... })`** makes something you can `await`. The `await` finishes when the code inside calls `resolve()`.

Put together: "wait here until `auth.ready` becomes `true`".
```js
if (!auth.ready) {
  await new Promise((resolve) => {
    const stop = watch(
      () => auth.ready,
      (ready) => {
        if (ready) {
          stop() // stop watching
          resolve() // let the await carry on
        }
      },
    )
  })
}
// from here on, auth.isLoggedIn is reliable
```

Used in: [router/index.js](../src/router/index.js) for the login guard (written by a teammate, kept instead of Ryan's version).

## Testing with Playwright

The Week 4–6 project setup includes Playwright with one example test (`e2e/vue.spec.js`: `test`, `expect`, `page.goto`, `page.locator`, `toHaveText`). These are the extra pieces our tests use. Run them with `npm run test:e2e`, or `npx playwright test --ui` to watch.

All of these are used in [dashboard.spec.js](../tests/e2e/dashboard.spec.js) and [midpoint.spec.js](../tests/e2e/midpoint.spec.js).

### Finding elements: `getByRole`, `getByText`, `getByLabel`
Find things the way a person (or screen reader) would, instead of by CSS class, so tests don't break when styling changes.
```js
page.getByRole('button', { name: 'Past' }) // a <button> whose text is "Past"
page.getByRole('heading', { name: 'Friday dinner after class' }) // an <h1>–<h6> with that text
page.getByText('No past hangouts yet.') // any element showing this text
page.getByLabel(/Time today/) // the input whose <label> contains "Time today"
```

### Acting: `.click()` and `.fill(value)`
`click()` clicks like a mouse. `fill()` types into an input; on a range slider it sets the value and fires the events, so `@change` runs.

### Checking: `toBeVisible`, `toHaveURL`, `toHaveCount`
```js
await expect(page.getByText('Voting · 3 of 4 voted')).toBeVisible() // on screen
await expect(page).toHaveURL('/hangouts/demo/vote') // the address bar
await expect(page.locator('path.crowd-midpoint')).toHaveCount(1) // exactly one match
```
`expect(locator)` checks keep retrying for up to 5 seconds, so they wait for API data to arrive. `expect(number)` checks like `toBeLessThanOrEqual(4)` run once, straight away.

### `page.waitForRequest(test)`
Gives a promise that finishes when the page sends a request matching `test`. Start waiting *before* the action that triggers it, then `await` it after.
```js
const request = page.waitForRequest((r) => r.url().includes('/api/crowd'))
await page.getByLabel(/Time today/).fill('38')
await request // proves moving the slider called the API
```

### `request.get(url, { params })`
Calls an API directly, without opening a page. Works like `axios.get`, but `res.ok()`, `res.status()` and `await res.json()` replace `response.data`.

Used in: [api.spec.js](../tests/e2e/api.spec.js).

### `page.once('dialog', (dialog) => dialog.accept())`
When the page pops up `window.confirm(...)` ("Delete this hangout?"), Playwright clicks **Cancel** by default. This tells it to click **OK** on the next popup only. Set it up *before* the click that opens the popup.
```js
page.once('dialog', (dialog) => dialog.accept())
await deleteButton.click() // the confirm popup opens and is accepted straight away
```
Used in: [tests/live/dashboard.spec.js](../tests/live/dashboard.spec.js) to delete the test hangout at the end.

## Regular expressions

### `/pattern/`
A pattern for matching text, written between slashes. `^` means "starts here", `$` means "ends here", and `(a|b|c)` means "one of these".
```js
/^Good (morning|afternoon|evening)!$/.test('Good morning!') // true
/^Good (morning|afternoon|evening)!$/.test('Good night!') // false
```
Used in: [smoke.spec.js](../tests/e2e/smoke.spec.js) to match the dashboard greeting at any time of day, and `getByLabel(/Time today/)` in [midpoint.spec.js](../tests/e2e/midpoint.spec.js). `$` on its own: `/\/start$/` in [tests/live/dashboard.spec.js](../tests/live/dashboard.spec.js) means "the URL ends with `/start`", whatever the hangout id before it is (`\/` is a `/` inside a regex).

### `\d` and `+`
`\d` means "any digit, 0–9". `+` after something means "one or more of it". Together, `\d+` matches a whole number of any length.
```js
/\d+ busy/.test('12 busy') // true
/\d+ busy/.test('0 busy') // true
/\d+ busy/.test('busy') // false: no number
```
Used in: [dashboard.spec.js](../tests/e2e/dashboard.spec.js) to check the "Crowds right now" counts without caring what the numbers are, since live LTA data changes all day.

## Comments

### JSDoc: `/** @param ... @returns ... */`
A special comment above a function that describes its inputs and output. It does nothing when the code runs, but VS Code reads it and shows the description when you hover over the function or type its name. (Seen in Week 6 `server/model/Mart.js`, which uses `@return`; `@returns` means the same.)
```js
/**
 * @param {Date} at the time on the heat map's slider
 * @returns {Promise<Array<{ station: string, level: string }>>}
 */
```
- `@param {Date} at`: the input called `at` should be a `Date`.
- `@returns {Promise<...>}`: the function gives back a Promise (because it's `async`) that resolves to an array of objects with those fields.

Used in: most files in `src/services/` and `api/`.

## Server code

### Vercel serverless functions: `export default async function handler(req, res)`
Each file in `api/` becomes a URL (`api/crowd.js` → `/api/crowd`). Vercel calls the exported function for each request. `req.query` holds the `?key=value` parts; `res.status(400).json({...})` sends a reply. It works like an Express route (WAD1 recap), but without `app.get(...)` or `app.listen(...)`.

Used in: [api/crowd.js](../api/crowd.js), [api/route.js](../api/route.js), [api/places.js](../api/places.js).

### `process.env.NAME`
Reads a secret or setting from `.env.local` (locally) or from Vercel's dashboard (when deployed). Secrets live here so they never end up in the code or on GitHub. (Seen only in the Week 4 Playwright config.)
```js
headers: { AccountKey: process.env.LTA_ACCOUNT_KEY }
```
Used in: [api/crowd.js](../api/crowd.js).

### `process.loadEnvFile('.env.local')`
Built into Node (version 20.12 and later). Reads a `.env` file and copies each `NAME=value` line into `process.env`. Vite does this by itself for the app, but Playwright runs in plain Node, so its config has to ask for it.
```js
process.loadEnvFile('.env.local')
process.env.E2E_EMAIL // now the value from .env.local
```
Used in: [playwright.live.config.js](../playwright.live.config.js), so the live tests can log in with the test account.
