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
