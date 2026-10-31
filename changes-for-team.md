# Changes for the team

Add your own section under your name. Say which files you changed and what the rest of us should know.

## Ryan (08 map, dashboard, friends, chats)

Branch: `feat/ryan-map-badge-layout`

Layout check done at 375px, 768px and 1366px on dashboard, friends, chats and 08. Nothing scrolls sideways. Every button on those pages is now at least 44px tall.

### What changed

| File | Change |
|---|---|
| `src/components/heatmap/CrowdHeatmap.vue` | Midpoint pin is blue (`#1d4ed8`), it was teal and blended into the green crowd circles. Zoom buttons are 44px on phones. |
| `src/components/ui/NavBar.vue` | The logged-out "Log in" button is 44px (new `.login-btn`). The logged-out navbar is about 14px taller. Logged in is the same. |
| `src/views/FriendsView.vue` | Friend row buttons, the Search button and input, and the ··· menu are 44px. |
| `src/components/friends/AddToHangout.vue` | The dropdown button is 44px too (it is a child component, so FriendsView's styles don't reach it). From 576px up, the plain link and the dropdown are the same width. |
| `src/views/MyChatsView.vue` | The search box is 44px. |
| `src/components/dashboard/HangoutCard.vue` | The laptop rows had 38px and 32px buttons on purpose. View, Add starting point and the ··· menu are now 44px. |
| `src/views/MidpointView.vue` | "Go to transport →" is 44px. |
| `tests/live/dashboard.spec.js` | The live test deleted hangouts with a button that no longer exists, so it left test hangouts behind. It now deletes through the ··· menu and the confirm dialog. |

### Good to know

- Vue's scoped styles don't reach into child components. If a button inside a child component is the wrong size, fix it in that component's own `<style scoped>`.
- Demo mode (no Supabase keys) has no chats, no friends' hangouts and no dropdowns, so it hides some layout problems. Check with a real account too.
- The ··· menu on friends and the "need your input" chip are fine. The chip is 32px but has an invisible 44px tap area.

### Still open

- Unread badge on the live site: the code works against the Supabase project in `.env.local` (the friends badge shows). Check that the Vercel env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) point at the same project.

### For others

- **Surya (06):** the "Invite" button is 36px, the map zoom buttons are 30px. The same phone fix as in `CrowdHeatmap.vue` works for `MembersMap.vue`:
  ```css
  @media (max-width: 767px) {
    :deep(.leaflet-control-zoom a) {
      width: 44px;
      height: 44px;
      line-height: 44px;
      font-size: 22px;
    }
  }
  ```
- **Matrix (05):** on "Who's coming?", the "Often with you" badges are clipped at the right edge, and the tick boxes look under 44px.

## Surya (06 starting points, Preferences setup)

Branches: `fix/members-map-zoom-buttons`, `fix/preferences-progress` (also has the 06 Next button and chat colour)

### What changed

| File | Change |
|---|---|
| `src/components/map/MembersMap.vue` | The + / − zoom buttons on the 06 map are 44x44px on phones (under 768px), using Ryan's fix from `CrowdHeatmap.vue`. Tablets and laptops are unchanged. |
| `src/views/StartingPointsView.vue` | Once your starting point is saved, **Next: choose transport →** sits right under the search and "Use my current location" (it was inside the green box at the top, which now just says it's saved and who's still adding theirs). The **💬 Group chat** button is filled coral (`--fp-accent`) with dark text, so it stands out from the green buttons; the red unread badge has a white ring so it shows on coral. Still exactly one Next link on the page. |
| `src/components/hangout/HangoutBar.vue`, `src/utils/planningLinks.js` (Nicole's) | **💬 Chat button in the step bar** on every step except 06 (which has its own), coral like 06's, with the red unread count (`alerts.unreadIn`). It opens the chat page with `?from=<step>`, so the chat offers "← Back to Midpoint" etc. I added Midpoint, Spots, Final plan and Debrief to `BACK_LABELS` in `planningLinks.js` for that. 44px on phones and tablets. |
| `src/components/start/LatestMessage.vue` (new), `StartingPointsView.vue` | **Newest chat message on 06**, under the saved box: "💬 Nicole: I'm leaving from Tampines · Reply". Tapping it opens the chat panel. Hidden when the chat is empty (and in the demo, which has no chat). It reloads when Ryan's alerts store sees a new message, so there's no second live listener on the same chat. |
| `StartingPointsView.vue`, `tests/e2e/dashboard.spec.js` (Ryan's test) | Removed the 🔒 "Only people in this hangout can see your starting point…" note on 06, to keep the page short. **Ryan:** I deleted your test "the starting points page says who sees a starting point", since the note is gone on purpose. |
| New `src/services/goAgain.js`; `CreateHangoutView.vue` (Matrix's), `DebriefView.vue` (Eashvar's), `HangoutCard.vue` + `DashboardView.vue` (Ryan's) | **↻ Go again** on a decided past hangout (Past card and Debrief): 05 opens with `?again=<id>`, the name, vibe and group filled in and a banner saying where you're going. Create makes the new hangout with the same group, place, midpoint and everyone's starting point and transport copied, already confirmed, and opens 12 Final plan. Untick someone on 05 to leave them out. Uses the existing `createHangout`, `addMember`, `saveMidpoint`, `addToShortlist` and `closeVote`, no new SQL. **Matrix:** the Go again path is a separate branch at the top of `submit()`. **Ryan:** new `past` prop on HangoutCard. |
| New `supabase/migrations/2026-10-30-hangout-photos.sql` (also in `schema.sql`), `src/services/photos.js`, `src/components/debrief/HangoutPhotos.vue` | **Photos on past hangouts.** A Photos panel on Debrief: anyone in the hangout adds photos (shrunk to 1600px JPEG on the phone first), taps one to see it big, and removes their own (the host can remove any). Past cards show up to 3 thumbnails and "+N", opening Debrief at the photos. Private Storage bucket `hangout-photos` with signed links, and members-only rules. **Needs the SQL run once in Supabase.** **Ryan:** new `photos` prop on HangoutCard, and `loadPhotos()` on the dashboard (one request for all past hangouts). On the **Past** tab, a hangout with a place chosen now opens Debrief ("See how it went") even if it's only confirmed, not marked done, so the photos are always one tap away (the plan is linked from Debrief). **Eashvar:** the Photos panel is at the bottom of Debrief, and "Go again" is first in What next. Also, your trip table on Debrief is 6px too wide at 320px. |
| `HangoutBar.vue`, `StartingPointsView.vue` | **06's chat is in the step bar now**, like every other step: the coral pill by the heading is gone. On 06 the bar's 💬 Chat opens 06's side panel (it adds `?chat=1`, and 06 opens the panel and clears it); elsewhere it opens the chat page. The Chat button has **10px corners** (`--fp-radius-sm`) instead of a pill. |
| `router/index.js`, `hangouts.js` (Matrix's), `CreateHangoutView.vue` (Matrix's), `HangoutBar.vue` | **✎ Details: change a hangout after it's made.** New route `/hangouts/:id/edit` (`edit-hangout`) opens 05 in edit mode: name, date, time and vibe filled in, "Save changes", then back to the step you came from (`?from=`). "Who's coming" becomes a list with a link to 06, and the "Let friends add" switch is hidden. Host only (others see "Only the host can change…"). In the step bar it's **step 0 "Details"**, which takes the place of the "Get there" label and joins step 1 with a line like the other steps (non-hosts still see "Get there"); on phones, ‹ on step 1 goes there ("Step 0 · Details"). New `updateHangoutDetails()` in `hangouts.js`, which errors for a non-host. **Matrix:** edit mode is `isEdit` plus `saveEdit()` near the top of `submit()`. To keep the bar on two lines at 1200–1365px, the member avatars hide there, and the lines between steps are 24px instead of 32px. |
| `src/views/PreferencesView.vue` (Matrix's page) | Setup after sign-up (`/preferences?setup=1`): the thin progress line is now **4 segments**, one per step, filled as you go, with "Step 2 of 4" and the step's topic ("Food"). The bar and the setup cards now span the page width, in line with the title on the left and the Next button on the right (they were a 680px column in the middle). It's hidden on the intro screen, where the empty line looked like a divider (tester's screenshot on a phone). The intro card heading is now "4 quick questions", so the page title isn't repeated. Steps, saving and "Skip for now" are unchanged. |
| New `supabase/migrations/2026-10-31-delete-account.sql` (also in `schema.sql`), new `src/services/account.js`, `PreferencesView.vue` (Matrix's page) | **Delete my account** at the bottom of 03 (not during setup): type DELETE, then "Delete forever" deletes the account and logs out to the landing page. It removes their preferences, friends, chats, votes, messages and photos. **Hangouts and groups they run pass to the next person who joined**, so friends keep them (removed only if nobody else is in them). Spots they added stay in shortlists and votes, with `added_by` set to empty. `shortlist.added_by` can now be null (`on delete set null`), since without that a delete fails for anyone who ever added a spot. The login is deleted by `delete_my_account()` in the database, which only ever deletes the person calling it, so no service_role key is in the app. **Needs the SQL run once in Supabase.** **Matrix:** a separate panel after your form, with its own small script part at the end of `<script setup>`. **Everyone:** code reading `shortlist.added_by` should allow it to be null (`useShortlist.js` and `places.js` already do). |

06 map checked at 320px, 375px, 768px and 1366px. 06 Next button and chat colour checked at 320px, 375px, 768px, 1366px and 1920px. Preferences checked at 320px, 375px, 768px, 1366px and 1920px, through all 4 steps. Nothing scrolls sideways.

### Still open

- The "Invite" button on 06 is 36px (Ryan's note above). Not fixed yet.

## Eashvar (11 Vote, 12 Final plan)

Branch: `feat/vote-layout`

Layout check done at 375px, 768px and 1366px on 11 Vote, 12 Final plan and the "How it went" page, in every state: voting open, the host starting the vote, the tie-break wheel, voting closed, the plan before and after it's confirmed, and marked done. Nothing scrolls sideways. Every button on those pages was already at least 44px tall, apart from the map's (see below).

### What changed

| File | Change |
|---|---|
| `src/views/VoteView.vue` | The host's "Close vote & confirm plan" card now sits right under the "Voting closes" card. Phones and tablets show one column, and it used to be the last thing on the page, below the activity feed and chat. On laptops it's also higher up the right column now. |
| `tests/e2e/voting.spec.js` | The layout test checked 3 pages at 375px only. It now checks 6 states (including the wheel, done and "How it went") at 375, 768 and 1366px: 18 tests. |

### Good to know

- Below 992px, page 11 is one column, so anything in the right column ends up under the spots. That's why the host controls moved up.
- The layout test leaves out the map's own zoom buttons and pins (Leaflet), since that's Surya's component.

### For others

- **Surya (`MembersMap.vue`, used on 12):** thanks for the 44px zoom buttons on phones. On tablets and laptops they're still 30px. The map also cuts off pins at its edges at every width (on the demo, Woodlands at the top and Punggol under the zoom buttons). It looks like `fitBounds` runs before the column has its final size; calling `map.invalidateSize()` and then `fitBounds` again once it's on screen should fix it.

## Eashvar (tests)

Branch: `test/ci-and-coverage`

### What changed

| File | Change |
|---|---|
| `.github/workflows/tests.yml` (new) | **Tests now run on every PR into `main`** (and every push to it): lint, build, then all of `tests/e2e`. The PR gets a **Tests** check. No keys needed. If it's red, open the check and download `playwright-report` (screenshots of what broke). |
| `playwright.config.js` | The tests start their own dev server on port 5198, always without the Supabase keys, so they never reuse your own server (5173) and give the same results on every laptop and on GitHub. Browser set to Singapore time. |
| `tests/e2e/smoke.spec.js` | The main journey test (new hangout to final plan) works again: its fake spot now sits at whatever midpoint the page searches (it was fixed at Bishan, and 09's 1 km filter hid it once the midpoint became Marymount), and it answers 10's "one spot by id" request. |
| New page tests | `landing`, `auth` (log in, sign up, forgot password), `preferences` (incl. the 4-step setup), `createHangout` (05), `startingPoints` (06), `explore` (09 filters, sort, Hide 0%, distance, shortlist, 3 per person, phone cards), `spotDetails` (10), `crowds`. Every page now has tests. |
| `tests/e2e/layout.spec.js` (new) | Every page at 375, 768 and 1366px: fails if anything scrolls sideways (none do). Buttons under 44px are listed in the report without failing. |
| `tests/live/account.spec.js`, `together.spec.js` (new) | Real accounts: wrong password, log out, preferences kept after reload, starting point saved; and two people: not a member until invited, invite link, the host sees the friend join live, a whole vote with live tally and both see the final plan. Run with `npm run test:live`; needs `E2E_EMAIL_2` / `E2E_PASSWORD_2` for the two-person test. |
| `tests/e2e/assistant.spec.js` | The Ask box page tests skip themselves until the box is back on 09 (`fix/restore-ask-box`), then run again by themselves. |

### For others

- **Hugo (09):** `Go Vote!` and `Add to vote` are 31px tall on phones. The phone test in `explore.spec.js` is marked as a known failure; when they're 44px, Playwright reports it as "unexpectedly passed", so delete the `test.fail(...)` line. On 10, `Back to exploring`, `Open Google Maps` and `Add to Vote` are 31px.
- **Matrix (02, 03):** on log in / sign up, `Show password`, `Forgot password?` and the switch link are 20–22px; on Preferences the choice chips are 37px.
- **Everyone:** if your PR's Tests check is red because you changed what a page says or does on purpose, update the test that checks it (or ask me).
