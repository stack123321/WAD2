# Beyond the syllabus

Functions and techniques used in Fairpoint that the IS216 WAD2 course folder doesn't teach (Weeks 1–6 plus the WAD1 recap, checked by searching the course code and the slide text). Each entry says what it does, shows a small example, and links to where we use it.

"Seen" means it appears in course-provided code but isn't explained in the lessons.

Libraries the course doesn't cover at all (Supabase for the database, login and live updates, Leaflet for maps, Google Places, OneMap and Gemini behind our own `api/` functions) are described in the README.

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

### `date.getUTCHours()`, `getUTCDay()`, `setUTCDate()` and `Date.parse(text)`
The `UTC` versions read or change a `Date` in UTC instead of the computer's own time zone. Vercel's servers run in UTC, so we add 8 hours ourselves and then read the UTC parts, which gives Singapore time on any machine. `Date.parse(text)` is `new Date(text).getTime()` in one step.
```js
const sg = new Date(date.getTime() + 8 * 60 * 60 * 1000)
sg.getUTCDay() // 0 = Sunday … 6 = Saturday, in Singapore
```
Used in: [matchScore.js](../src/utils/matchScore.js) (opening hours), [WeekForecast.vue](../src/components/weather/WeekForecast.vue), [api/assistant.js](../api/assistant.js).

### `new Intl.DateTimeFormat(locale, options).format(date)`
The same formatting as `toLocaleDateString`, set up once and reused. The server uses it to tell Gemini today's date in Singapore.

Used in: [api/_gemini.js](../api/_gemini.js), [api/assistant.js](../api/assistant.js).

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

### `list.map(fn)`
A new list with `fn` applied to every item; the original isn't changed. (Seen once in the course code.)
```js
store.members.map((m) => m.display_name) // ['Ryan', 'Nicole', 'Hugo']
```
Used in: almost every page, e.g. [VoteView.vue](../src/views/VoteView.vue).

### `list.some(test)` and `list.every(test)`
`some` is `true` if at least one item passes the test; `every` only if all of them do. Both stop as soon as they know the answer.
```js
votes.some((v) => v.user_id === member.user_id) // has this member voted?
```
Used in: [matchScore.js](../src/utils/matchScore.js), [VoteView.vue](../src/views/VoteView.vue), [api/route.js](../api/route.js).

### `new Set()` and `new Map()`
A `Set` is a list where each value appears only once, with a quick `.has(value)`. A `Map` stores values by key like an object, with `.get(key)` and `.set(key, value)`. (Each seen once in the course code.)
```js
const addedIds = new Set(['ChIJ123']) // addedIds.has('ChIJ123') → true
const ownerOf = new Map([['ChIJ123', 'u-ryan']]) // ownerOf.get('ChIJ123') → 'u-ryan'
```
Used in: [useShortlist.js](../src/composables/useShortlist.js), [ExploreView.vue](../src/views/ExploreView.vue), [holidays.js](../src/services/holidays.js), [api/route.js](../api/route.js).

### `list.flat()` and `list.flatMap(fn)`
`flat()` turns a list of lists into one list. `flatMap(fn)` is `map(fn)` followed by `flat()`.
```js
[[1, 2], [3]].flat() // [1, 2, 3]
```
Used in: [api/_google.js](../api/_google.js) (one Google search per place type), [api/assistant.js](../api/assistant.js).

## Text

### `text.includes(part)`
`true` if `part` appears anywhere inside `text`. Capitals matter: `'Bishan'.includes('bishan')` is `false`.
```js
'Bishan (sample)'.includes('(sample)') // true
'Bishan'.includes('(sample)') // false
```
Used in: [CrowdHeatmap.vue](../src/components/heatmap/CrowdHeatmap.vue) and [CrowdsNow.vue](../src/components/heatmap/CrowdsNow.vue) to tell when api/crowd.js sent sample data because LTA was unavailable.

### `text.startsWith(part)` and `text.endsWith(part)`
`true` if `text` begins (or ends) with `part`.
```js
'demo-2'.startsWith('demo') // true: one of the sample hangouts
```
Used in: [services/hangouts.js](../src/services/hangouts.js), [HangoutBar.vue](../src/components/hangout/HangoutBar.vue), [MembersMap.vue](../src/components/map/MembersMap.vue).

### `text.padStart(length, fill)`
Adds `fill` at the front until the text is `length` long, for times like 7:05. (Seen in the course code.)
```js
String(5).padStart(2, '0') // "05"
```
Used in: [HangoutBar.vue](../src/components/hangout/HangoutBar.vue), [openingHours.js](../src/utils/openingHours.js), [CreateHangoutView.vue](../src/views/CreateHangoutView.vue).

### `text.replaceAll(find, replace)` and `text.repeat(n)`
`replaceAll` swaps every match, not just the first one like `replace`. `repeat` writes the text `n` times. (`replaceAll` is seen once in the course code.)
```js
'a < b < c'.replaceAll('<', '&lt;') // "a &lt; b &lt; c"
'$'.repeat(2) // "$$", the price level on a spot card
```
Used in: [escapeHtml.js](../src/utils/escapeHtml.js), [SpotCard.vue](../src/components/spots/SpotCard.vue), [CandidateCard.vue](../src/components/voting/CandidateCard.vue).

### `a.localeCompare(b)`
Compares two texts the way a dictionary would, so a sort puts names A to Z whatever their capitals.
```js
names.sort((a, b) => a.localeCompare(b)) // ['hugo', 'Nicole', 'ryan']
```
Used in: [peopleSearch.js](../src/utils/peopleSearch.js), [groups.js](../src/services/groups.js).

### `text.charCodeAt(i)` and `>>> 0`
`charCodeAt` gives the number behind a character (`'A'` is 65). We turn a name into one number so the same name always gets the same avatar colour. `>>> 0` keeps that number a positive whole number however big it gets.

Used in: [avatarColor.js](../src/utils/avatarColor.js).

## Maths

### `Math.abs(n)`
The absolute value: removes the minus sign. Use it when you care how far apart two numbers are, not which one is bigger.
```js
Math.abs(-5) // 5
Math.abs(at.getTime() - Date.now()) < 30 * 60 * 1000 // within 30 min, before or after now
```
Used in: [api/crowd.js](../api/crowd.js).

### `Math.round(n)`
Rounds to the nearest whole number (`2.5` → `3`). The course uses `Math.floor`, which always goes down, and `toFixed`, which gives text.

Used in: [services/weather.js](../src/services/weather.js), [utils/dates.js](../src/utils/dates.js) and most places that show minutes.

### `Number.isFinite(n)`
`true` only for a real number: not `NaN`, `Infinity` or text. We check values read from the database or a request with it before using them.

Used in: [PreferencesView.vue](../src/views/PreferencesView.vue), [api/assistant.js](../api/assistant.js).

### `Math.sin`, `Math.cos`, `Math.asin` and `**`
The haversine formula: the straight-line distance between two points on the globe, from their latitude and longitude. `x ** 2` is `x * x`.

Used in: `distanceKm` in [matchScore.js](../src/utils/matchScore.js) (also used by 09 Explore), and the server's own copy in [api/_mocks/geo.js](../api/_mocks/geo.js).

## Objects and missing values

### `a?.b` (optional chaining) and `a ?? b` (nullish coalescing)
`a?.b` gives `undefined` instead of an error when `a` is `null` or `undefined`. `a ?? b` gives `b` only when `a` is `null` or `undefined`; unlike `||`, a `0` or `''` is kept. (Each seen in the course code.)
```js
auth.user?.id ?? null // the user's id, or null when logged out
```
Used in: most files.

### `structuredClone(value)`
A deep copy: lists and objects inside it are copied too, so changing the copy never changes the original. We copy the sample data before handing it out. The taught way, `JSON.parse(JSON.stringify(value))`, does the same for this data but is longer.

Used in: [services/hangouts.js](../src/services/hangouts.js), [services/groups.js](../src/services/groups.js), [PreferencesView.vue](../src/views/PreferencesView.vue).

### `Object.assign(target, source)`
Copies every field of `source` onto `target`. We fill a `reactive` object this way, because a `reactive` object can't be replaced with `=`. (Seen once in the course code.)
```js
Object.assign(prefs, clean(profile)) // prefs stays the same reactive object
```
Used in: [PreferencesView.vue](../src/views/PreferencesView.vue), [useExploreMemory.js](../src/composables/useExploreMemory.js).

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
Used in: [mapSetup.js](../src/utils/mapSetup.js), which every map in the app uses.

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

### `Promise.allSettled([...])`
Like `Promise.all`, but waits for every request even if some fail, and says which worked (`status: 'fulfilled'`) and which didn't. So a few failed Google searches don't hide the spots from the ones that worked.

Used in: [api/_google.js](../api/_google.js).

### `fetch(url, options)` (server only)
The built-in way to call a URL. The app itself uses axios, as taught; `fetch` is left in one server file, where it sends Google's POST request with Google's own headers.

Used in: [api/_google.js](../api/_google.js).

### `sessionStorage`
Like `localStorage`, but forgotten when the tab is closed. We use it for things that should last one visit: the dismissed haze banner, and the 20-minute cache of nearby spots.

Used in: [DashboardView.vue](../src/views/DashboardView.vue), [services/places.js](../src/services/places.js).

### `clearTimeout(id)`, `setInterval(fn, ms)` and `clearInterval(id)`
`clearTimeout` cancels a `setTimeout` that hasn't run yet. We restart a short timer on every key press, so a search only runs once typing stops. `setInterval` runs `fn` again every `ms` milliseconds (the vote countdown) until `clearInterval` stops it.
```js
clearTimeout(timer)
timer = setTimeout(search, 400) // search 0.4 s after the last key press
```
Used in: [CreateHangoutView.vue](../src/views/CreateHangoutView.vue), [AuthView.vue](../src/views/AuthView.vue), [VoteView.vue](../src/views/VoteView.vue), [FinalPlanView.vue](../src/views/FinalPlanView.vue).

### `addEventListener(type, fn)` and `removeEventListener(type, fn)`
Listen for an event from JavaScript, for things a template can't reach: scrolling the window, a click anywhere on the page, or Bootstrap's dropdown events. Remove the listener when leaving the page.
```js
window.addEventListener('scroll', checkMapInView)
window.removeEventListener('scroll', checkMapInView)
```
Used in: [LandingView.vue](../src/views/LandingView.vue), [ExploreView.vue](../src/views/ExploreView.vue), [HangoutCard.vue](../src/components/dashboard/HangoutCard.vue), [useMediaQuery.js](../src/composables/useMediaQuery.js).

### `element.getBoundingClientRect()`, `window.innerHeight` and `window.scrollY`
Where an element is on the screen right now (`top`, `height` …), how tall the window is, and how far the page has scrolled. We use them to start the landing map's animation once it's on screen, and to make 06's map fill the rest of the screen.

Used in: [LandingView.vue](../src/views/LandingView.vue), [StartingPointsView.vue](../src/views/StartingPointsView.vue).

### `element.closest(selector)`
The nearest element that matches the CSS selector, starting from this one and going up through its parents, or `null`. We use it to tell whether a click landed inside a pop-up.
```js
if (!event.target.closest('.filters')) closeFilters() // clicked outside the Filters menu
```
Used in: [ExploreView.vue](../src/views/ExploreView.vue).

### `classList.toggle(name, on)` and `style.setProperty(name, value)`
Add or remove a CSS class, or set a CSS variable, on an element outside the app's template, such as `<body>` or `<html>`.
```js
document.body.classList.toggle('has-tabbar', auth.isLoggedIn)
document.documentElement.style.setProperty('--fp-sticky-top', '9rem')
```
Used in: [NavBar.vue](../src/components/ui/NavBar.vue), [App.vue](../src/App.vue), [ExploreView.vue](../src/views/ExploreView.vue).

### `element.focus()`, `scrollIntoView()` and `scrollTo()`
Move the keyboard focus to an element (the first field with an error), scroll the page until an element shows, or scroll a box to a position (the photo and card carousels).

Used in: [AuthView.vue](../src/views/AuthView.vue), [PreferencesView.vue](../src/views/PreferencesView.vue), [SpotCarousel.vue](../src/components/spots/SpotCarousel.vue).

### Shrinking a photo with a `<canvas>`
`createImageBitmap(file)` opens the photo, `drawImage` paints it smaller on a canvas made with `document.createElement('canvas')`, and `canvas.toBlob(fn, 'image/jpeg', 0.8)` turns it back into a file. A 6 MB phone photo becomes about 300 KB before it's uploaded.

Used in: [services/photos.js](../src/services/photos.js).

### `crypto.getRandomValues(new Uint8Array(n))`
`n` random numbers from the browser's secure generator. Invite codes are made this way rather than with `Math.random()` (taught), because codes made with `Math.random()` could in theory be predicted and guessed.

Used in: `makeInviteCode` in [services/hangouts.js](../src/services/hangouts.js).

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
Used in: [useMediaQuery.js](../src/composables/useMediaQuery.js), [ExploreView.vue](../src/views/ExploreView.vue).

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
Used in: [VoteResults.vue](../src/components/voting/VoteResults.vue), [CandidateCard.vue](../src/components/voting/CandidateCard.vue), [VoteView.vue](../src/views/VoteView.vue), the Landing FAQ, and [DashboardView.vue](../src/views/DashboardView.vue) to keep every card except the one with its ⋯ menu open faded.

### `pointer-events: none` and `pointer-events: auto`
`none` makes an element ignore the mouse: hovering or clicking it acts on whatever is underneath. Children inherit it, and `auto` switches it back on. Here the list ignores the mouse but its cards don't, so `.card-list:hover` is only true while the pointer is on a card, not in the gaps between them.
```css
.card-list { pointer-events: none; }
.card-list .hangout { pointer-events: auto; }
```
Used in: [DashboardView.vue](../src/views/DashboardView.vue).

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

### `minmax(0, 1fr)` in a grid
`1fr` columns normally grow to fit their widest content. `minmax(0, 1fr)` lets them shrink below it instead, so long text or a photo can't push the grid wider than the screen.
```css
grid-template-columns: repeat(5, minmax(0, 1fr)); /* five equal columns, whatever is inside */
```
Used in: [WeekForecast.vue](../src/components/weather/WeekForecast.vue), [HangoutPhotos.vue](../src/components/debrief/HangoutPhotos.vue), [HangoutCard.vue](../src/components/dashboard/HangoutCard.vue).

### `clamp(min, preferred, max)`
A size that follows `preferred` (often part of the screen width) but never goes below `min` or above `max`.

Used in: [GroupView.vue](../src/views/GroupView.vue), [SpotDetailsView.vue](../src/views/SpotDetailsView.vue).

### `@keyframes` and `animation`
`@keyframes name { from { … } to { … } }` describes the steps of an animation, and `animation: name 0.6s` plays it. The landing map uses them: the pins drop in and the midpoint ring pulses. They're switched off when the device asks for reduced motion.

Used in: [LandingView.vue](../src/views/LandingView.vue).

### `scroll-snap-type` and `scroll-snap-align`
Make a sideways-scrolling row stop with a card neatly lined up, instead of halfway between two.

Used in: [SpotCarousel.vue](../src/components/spots/SpotCarousel.vue), [SpotDetailsView.vue](../src/views/SpotDetailsView.vue).

### `text-overflow: ellipsis` and `-webkit-line-clamp`
Cut text that doesn't fit and end it with "…": `text-overflow: ellipsis` (with `white-space: nowrap; overflow: hidden`) for one line, and `-webkit-line-clamp: 2` for two lines.

Used in: [HangoutCard.vue](../src/components/dashboard/HangoutCard.vue), [SpotCard.vue](../src/components/spots/SpotCard.vue).

### `object-fit: cover`
Makes a photo fill its box without stretching it; the parts that don't fit are cropped.

Used in: [SpotHero.vue](../src/components/shared/SpotHero.vue), [HangoutPhotos.vue](../src/components/debrief/HangoutPhotos.vue).

### `::-webkit-scrollbar` and `scrollbar-width: none`
Hide the scrollbar of a sideways-scrolling row; the arrows and swiping still work. Chrome and Safari use the first, Firefox the second.

Used in: [SpotCarousel.vue](../src/components/spots/SpotCarousel.vue), [SpotDetailsView.vue](../src/views/SpotDetailsView.vue).

### `:focus-within` and `:global(.class)`
`:focus-within` matches an element when it, or anything inside it, has the keyboard focus. `:global()` inside `<style scoped>` writes a rule that isn't limited to this component, for a class put on `<html>` or `<body>`.

Used in: [GroupHangoutRow.vue](../src/components/groups/GroupHangoutRow.vue), [ExploreView.vue](../src/views/ExploreView.vue).

### `filter: drop-shadow(…)`
A shadow that follows the shape of an SVG drawing, where `box-shadow` would draw a rectangle.

Used in: [LandingView.vue](../src/views/LandingView.vue).

### `padding-block`, `padding-inline` and `inset`
Shorthands. `padding-block: 2rem 4rem` is `padding-top: 2rem; padding-bottom: 4rem` (`-inline` does left and right), and `inset: 0` is `top: 0; right: 0; bottom: 0; left: 0`.

Used in: [PreferencesView.vue](../src/views/PreferencesView.vue), [ConfirmDialog.vue](../src/components/ui/ConfirmDialog.vue).

## HTML

### `<dl>`, `<dt>` and `<dd>`
A description list: pairs of a label (`<dt>`) and a value (`<dd>`), like "When" and "Fri, 16 Oct, 7:00 pm". Screen readers read them as pairs.

Used in: [SpotHero.vue](../src/components/shared/SpotHero.vue), the summary on [CreateHangoutView.vue](../src/views/CreateHangoutView.vue).

### `<time datetime="…">`
Marks text as a date or time, with the exact value in `datetime` for browsers and screen readers.

Used in: [VoteView.vue](../src/views/VoteView.vue).

### `<form novalidate>`
Switches off the browser's own pop-up checks, so the form shows our messages under each field instead.

Used in: [AuthView.vue](../src/views/AuthView.vue), [CreateHangoutView.vue](../src/views/CreateHangoutView.vue), [PreferencesView.vue](../src/views/PreferencesView.vue).

## Vue

### `defineExpose({ ... })`
In `<script setup>` a component's functions are private. `defineExpose` lets the parent call one through a template ref, here so the page can switch the spot tab from outside.
```js
defineExpose({ selectTab })
```
Used in: [MidpointSpots.vue](../src/components/midpoint/MidpointSpots.vue), and [CrowdHeatmap.vue](../src/components/heatmap/CrowdHeatmap.vue) so 08 can put a dragged pin back when "Move the midpoint?" is cancelled.

### `reactive({ ... })`
Like `ref`, but for an object and without `.value`: `form.name` instead of `form.value.name`. Handy for a form with several fields.
```js
const form = reactive({ name: '', email: '', password: '' })
```
Used in: [AuthView.vue](../src/views/AuthView.vue), [CreateHangoutView.vue](../src/views/CreateHangoutView.vue), [PreferencesView.vue](../src/views/PreferencesView.vue).

### `watch(source, fn, { immediate, deep })` and `watchEffect(fn)`
`watch` runs `fn` whenever `source` changes (see "Waiting for something" under Vue Router). `immediate: true` also runs it once straight away, and `deep: true` notices changes inside objects and lists too. `watchEffect(fn)` runs `fn` now, and again whenever anything it reads changes.
```js
watch(() => props.members, drawPins, { deep: true }) // redraw when anyone's pin moves
```
Used in: most pages, e.g. [MembersMap.vue](../src/components/map/MembersMap.vue); `watchEffect` in [App.vue](../src/App.vue) and [NavBar.vue](../src/components/ui/NavBar.vue).

### `toRef(object, 'key')` and `toRefs(object)`
Make a `ref` that reads and writes one field of a `reactive` object, so it works like any other ref (`v-model`, `.value`).
```js
const sortBy = toRef(remembered, 'sortBy') // sortBy.value is remembered.sortBy
```
Used in: [ExploreView.vue](../src/views/ExploreView.vue), [AskSpots.vue](../src/components/assistant/AskSpots.vue).

### `await nextTick()`
Waits until Vue has updated the page after a change. It's needed before focusing or scrolling to something that has only just appeared.
```js
showErrors.value = true
await nextTick() // the error message is on the page now
field.focus()
```
Used in: [AuthView.vue](../src/views/AuthView.vue), [ConfirmDialog.vue](../src/components/ui/ConfirmDialog.vue), [HangoutChat.vue](../src/components/chat/HangoutChat.vue).

### `onUnmounted(fn)` and `onBeforeUnmount(fn)`
Run `fn` when the component leaves the page, to stop timers, listeners and live updates. (`onUnmounted` is shown once in the slides.) `onBeforeUnmount` runs just before, while the component's elements and template refs are still there: HangoutCard needs it because its clean-up reads a template ref, and the maps remove Leaflet while their `<div>` is still on the page.

Used in: [VoteView.vue](../src/views/VoteView.vue), [LandingView.vue](../src/views/LandingView.vue); `onBeforeUnmount` in [HangoutCard.vue](../src/components/dashboard/HangoutCard.vue), [BaseMap.vue](../src/components/map/BaseMap.vue), [MembersMap.vue](../src/components/map/MembersMap.vue).

### `defineModel()`
Makes `v-model` work on your own component in one line. The parent writes `<PaginationNav v-model="page" />`, and inside it `page.value = 2` updates the parent's `page`. The taught way is a `modelValue` prop plus an `update:modelValue` emit.

Used in: [PaginationNav.vue](../src/components/shared/PaginationNav.vue).

### `$event` and `$slots`
In a template, `$event` is the event, or the value a child emitted: `@change="emit('select', $event.target.value)"`. `$slots.header` is true when the parent filled the `header` slot, so the component can leave out the empty wrapper.

Used in: [ClosePanel.vue](../src/components/voting/ClosePanel.vue), [PlaceSearch.vue](../src/components/map/PlaceSearch.vue); `$slots` in [WeatherFrame.vue](../src/components/weather/WeatherFrame.vue).

### Event modifiers: `.prevent`, `.self`, `.esc`, `.up`, `.down`, `.passive`
Short forms Vue adds to `@event`. `@submit.prevent` stops the page reloading when a form is sent. `@click.self` only fires when the element itself is clicked, not something inside it (a pop-up's dark backdrop). `@keydown.esc`, `.up` and `.down` only fire for that key, like `@keyup.enter` in the course. `@scroll.passive` tells the browser the handler won't stop the scrolling.

Used in: [AuthView.vue](../src/views/AuthView.vue), [ConfirmDialog.vue](../src/components/ui/ConfirmDialog.vue), [PlaceSearch.vue](../src/components/map/PlaceSearch.vue), [SpotCarousel.vue](../src/components/spots/SpotCarousel.vue).

### Composables: `useSomething()` functions
A plain function in `src/composables/` that uses `ref`, `computed` or `watch` and returns them, so two pages can share the same logic. Call it at the top of `<script setup>`.
```js
const isWide = useMediaQuery('(min-width: 576px)') // a ref that's true on wider screens
```
Used in: [useShortlist.js](../src/composables/useShortlist.js) (09 and 10), [useHangoutPrerequisites.js](../src/composables/useHangoutPrerequisites.js), [useMediaQuery.js](../src/composables/useMediaQuery.js).

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

### `[A-Za-z]`, `[^\s@]`, `{6}`, `{2,}` and the `i` flag
`[A-Za-z]` matches any one letter, and `[^\s@]` any one character that is not a space or `@`. `{6}` means exactly 6 of the thing before it, and `{2,}` means 2 or more. An `i` after the closing slash ignores capitals.
```js
/[A-Za-z]/.test('abc12345') // true: the password has a letter
/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test('ryan@example.com') // true: looks like an email
/^#[0-9a-f]{6}$/i.test('#0E7C6B') // true: a colour code
```
Used in: [AuthView.vue](../src/views/AuthView.vue), [avatarColor.js](../src/utils/avatarColor.js).

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
