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

### `Number.isNaN(value)`
`true` if the value is `NaN` ("Not a Number"). `new Date('banana').getTime()` gives `NaN`, so this is how you check whether someone typed an invalid date. You can't use `value === NaN`, because `NaN` never equals anything, not even itself.
```js
Number.isNaN(new Date('banana').getTime()) // true → reply 400
```
Used in: [api/crowd.js](../api/crowd.js) to validate the `at` parameter.

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
Loads the map pictures ("tiles") from OpenStreetMap. `{z}/{x}/{y}` in the URL are filled in by Leaflet for each square of the map. OpenStreetMap's rules say you must show the `attribution` credit.

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
