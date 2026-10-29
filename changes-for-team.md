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
| `router/index.js`, `hangouts.js` (Matrix's), `CreateHangoutView.vue` (Matrix's), `HangoutBar.vue` | **✎ Details: change a hangout after it's made.** New route `/hangouts/:id/edit` (`edit-hangout`) opens 05 in edit mode: name, date, time and vibe filled in, "Save changes", then back to the step you came from (`?from=`). "Who's coming" becomes a list with a link to 06, and the "Let friends add" switch is hidden. Host only (others see "Only the host can change…"). In the step bar it's "✎ Details" before step 1 (just ✎ below 1440px); on phones, ‹ on step 1 goes there. New `updateHangoutDetails()` in `hangouts.js`, which errors for a non-host. **Matrix:** edit mode is `isEdit` plus `saveEdit()` near the top of `submit()`. To keep the bar on two lines at 1200–1439px, the member avatars hide there, and the lines between steps are 24px instead of 32px. |
| `src/views/PreferencesView.vue` (Matrix's page) | Setup after sign-up (`/preferences?setup=1`): the thin progress line is now **4 segments**, one per step, filled as you go, with "Step 2 of 4" and the step's topic ("Food"). The bar and the setup cards now span the page width, in line with the title on the left and the Next button on the right (they were a 680px column in the middle). It's hidden on the intro screen, where the empty line looked like a divider (tester's screenshot on a phone). The intro card heading is now "4 quick questions", so the page title isn't repeated. Steps, saving and "Skip for now" are unchanged. |

06 map checked at 320px, 375px, 768px and 1366px. 06 Next button and chat colour checked at 320px, 375px, 768px, 1366px and 1920px. Preferences checked at 320px, 375px, 768px, 1366px and 1920px, through all 4 steps. Nothing scrolls sideways.

### Still open

- The "Invite" button on 06 is 36px (Ryan's note above). Not fixed yet.
