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

- **Surya (`MembersMap.vue`, used on 12):** the zoom buttons are 30px. The phone fix in Ryan's section above works here too. The map also cuts off pins at its edges at every width (on the demo, Woodlands at the top and Punggol under the zoom buttons). It looks like `fitBounds` runs before the column has its final size; calling `map.invalidateSize()` and then `fitBounds` again once it's on screen should fix it.
