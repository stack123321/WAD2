# Figma walkthrough (about 20 min)

Figma: https://www.figma.com/design/VPDZrAHBK7HWniY3HM2wUY

Goal: everyone sees the new use-case layout, agrees on the open questions below, and knows what to change on their own page. Eashvar's intuitive check of the real app comes after this.

## What changed in the Figma

- **Grouped by use case.** The board is now 5 sections, one row each, instead of a 4 × 3 grid:
  1. Get started: 01 Landing, 02 Log in / Sign up, 03 Preferences
  2. Plan a hangout: 04 My hangouts, 05 Create & invite
  3. Get there: 06 Starting points, 07 Transport, 08 Midpoint
  4. Choose a spot: 09 Nearby spots, 10 Spot details
  5. Decide together: 11 Vote, 12 Final plan
- **Midway is now Fairpoint** everywhere, including the invite link (`fairpoint.app/login?invite=…`, matching the app).
- **Owners are up to date.** No more "Suggested · gap" or "Unassigned": every page shows its owner from the README, and "Who builds what" shows the current split.
- **Step bar on 06–12.** Matches `HangoutBar` (6 steps grouped as Get there · Choose · Decide, ticks on finished steps, current step dark). The app now shows it on every hangout page.
- **Matched to what's built:**
  - "Explore" is hidden in the nav on 03–12. The app has no top-level Explore page, because exploring needs a hangout (`/hangouts/:id/explore`).
  - 04: "Show more" under Crowds right now.
  - 11: heading is now "Group voting", like the app.

## Walkthrough order

Press Present from 01 and click through. At each section, the owners say in one sentence what's built and what's left.

| Section | Who talks | Ask |
|---|---|---|
| 1 Get started | Matrix | Do 01–03 match the Figma? |
| 2 Plan a hangout | Ryan, Matrix | Keep the Invitation card on 04? (there's no invitations table) |
| 3 Get there | Surya, Nicole, Ryan | 08 layout (below) |
| 4 Choose a spot | Hugo | Where does the map go on 09? |
| 5 Decide together | Eashvar | Closing a vote with no votes |

Then the alternate paths (dashed arrows): returning user 02 → 04, quick vote 09 → 11, back to my hangouts 12 → 04.

## Open questions to decide in the meeting

1. **08 layout.** The Figma has a full-screen map with the "Bishan" midpoint card (other fair options, Explore / Choose another area) and the crowd/weather toggle on top. The built page is a heading plus two cards (crowd map with time slider, weather) and a "See nearby spots" button. Pick one; the Figma follows.
2. **04 Invitation card.** Keep it (needs an invitations table from Matrix) or drop it from the Figma.
3. **12 heading.** The Figma shows the confirmed state ("It's on! Brew & Board Café"). The app shows "Final plan & itinerary" with the current leader before the vote closes. Does the Figma need a second 12 frame for the "not closed yet" state?
4. **Nav.** OK to drop "Explore" for good? Hugo is adding "+ New hangout" and the avatar from the Figma.

## Still different from the app (Figma is the target, no change needed)

- 12 map, weather and routes are still placeholders in the app.
- The app nav has no "+ New hangout" or avatar yet (Hugo's task).
