# Team to-do

**Last updated 13 Oct 2026**, checked against `main` after PR #10.

Everything left to do, from three sources:

- **[F]** written feedback on the proposal from Lay Foo Thiang and Dr Shar Lwin Khin (8–9 Oct 2026)
- **[M1]–[M7]** the consultation with Dr Shar on 9 Oct 2026 (meeting pointers below)
- **[C]** loose ends found in the code

The split follows what we agreed at the meeting. Anything the meeting didn't cover goes to the owner of that file in the README's "Who owns what" table.

## Where the feedback came from

### Written feedback on the proposal [F]

| From | Feedback | Decision |
|---|---|---|
| Lay Foo | Good, comprehensive feature list. The crux is how we **organise the information and the flow**. | Act on it |
| Lay Foo | **Create mockup pages** to work out the details, so everyone understands what's required. | Ryan updates the Figma |
| Lay Foo | Regrouped our features into **use cases** for a more intuitive flow (the pink edits). "You decide." | Accept the regrouping |
| Lay Foo, Dr Shar | "Past places suggested for the next meet-up" is awkward as a standalone feature. Use **past hangouts to improve recommendations** instead. | **Doing it** |
| Dr Shar | "Responsive and validated" is **not a separate feature**: build it into every feature. | Make it a design principle |
| Dr Shar | Design every page to be **intuitive, interactive** and use **progressive disclosure**. | Every page |

### Consultation with Dr Shar, 9 Oct [M]

1. Can the app track my location / use my current location? (page 06)
2. Send the prof the project proposal
3. Keep a history of past hangout places, and suggest them for the next meet-up
4. Pages should be responsive and intuitive (all pages)
5. Add validation to the functions
6. The app must handle different groups of people who want to meet up
7. Every page needs to be intuitive to users

## Design principles (every page, every owner)

These replace "Responsive and validated" as a feature. [F] [M4] [M5] [M7]

| Principle | What it means for us |
|---|---|
| **Responsive** | Works on phone, tablet and laptop. Check at 576 / 768 / 992 / 1200 px before every PR. |
| **Validated** | Every form and button checks its input: clear message next to the field, no crash on empty input. |
| **Intuitive** | Same nav bar, button styles and step bar everywhere, so it's always obvious what's next. Makes sense without explanation. |
| **Interactive** | Every action gets a visible response: button states ("Saving…", disabled), a loading spinner while waiting, clear success and error banners. |
| **Progressive disclosure** | Show only what's needed for this step. Extras go behind multi-step forms or "Show more". |

## Who does what

Size is a rough guess: **S** = under an hour, **M** = an afternoon, **L** = a day or more.
Status: ✅ done in `main` · 🟡 partly done · 🔜 to do · ⏸ waiting on someone

### Ryan
| Task | From | Size | Status |
|---|---|---|---|
| Edit the proposal (accept the use-case regrouping, fold past places into recommendations, replace "Responsive and validated" with a Design principles section) and **send it to the prof**, with Surya | F, M2 | M | 🔜 |
| **Update the Figma** (use-case sections, Midway → Fairpoint, step bar on 06–12), then run the team walkthrough with `docs/figma-walkthrough.md` | F | L | ✅ Figma · 🔜 walkthrough |
| **"Past" tab on 04 Dashboard**: show where the group went. Unblocked: closing a vote now saves the final spot and `getMyHangouts()` returns it | M3 | M | 🔜 |
| Responsive check on 04 and 08, "Show more" on Crowds right now, phone fix on hangout cards | M4, M7, F | M | ✅ |
| Swap Hugo's spinner and banners into 04 and 08 | F | S | ⏸ Hugo |
| Step bar on 08 | F | S | ✅ (App.vue adds it to every hangout page) |
| Login guard and the name in the dashboard greeting | C | S | ✅ |

### Surya
| Task | From | Size | Status |
|---|---|---|---|
| **"Use my location" on 06** | M1 | M | ✅ |
| Proposal edits and sending it, with Ryan | M2 | M | 🔜 |
| **Validation on 06** | M5 | S | ✅ |
| *(Optional)* Use-case groups in `HangoutBar` ("Get there · Choose · Decide") | F | S | ✅ |

### Matrix
| Task | From | Size | Status |
|---|---|---|---|
| **Save hangout history**: the final spot is saved when the vote closes (`closeVote`), `markHangoutDone` sets a hangout to done, `getMyHangouts()` is real | M3, C | M | ✅ |
| **Different groups**: create, invite from 06, join, leave / delete, and see all your hangouts on 04 | M6 | L | 🟡 built; Eashvar's two-group test still to confirm nothing mixes |
| **Form validation** on login, sign up, preferences and create hangout | M5 | M | 🟡 password length hint on sign up and "date in the future" on create are in; check the rest (required fields, email format) |
| Decide the Invitation card on the dashboard (there's no invitations table) | C | S | 🔜 |
| `matchScore.js`: score activities, dietary, budget, indoor-if-rain, avoid-crowds (still a TODO in the code) | C | M | 🔜 |

### Hugo
| Task | From | Size | Status |
|---|---|---|---|
| **Shared spinner and banner components** in `src/components/ui/` (everyone is waiting on these) | F | M | 🔜 |
| **Suggest past places on 09**: "You've been here before" badge, or rank them higher. Unblocked: past hangouts and their final spots are now available | M3 | M | 🔜 |
| **Map on 09 big enough to use** (page 06's map: right side on laptop, at least 640 px tall; 60% of screen height on phone) | M4 | M | 🔜 check |
| **Responsive lead**: check every page at 576 / 768 / 992 / 1200, fix shared styles in `tokens.css` and the nav bar ("+ New hangout" and the avatar from the Figma) | M4 | L | 🔜 |
| Step bar on 09 and 10, and an `<h1>` on 10 | F, C | S | ✅ |

### Nicole
| Task | From | Size | Status |
|---|---|---|---|
| **Midpoint for any group**: `pickFairestArea()` for 2 to N people, skipping anyone without a starting point (still a TODO in `utils/midpoint.js`) | M6 | M | 🔜 |
| **Validation on 07**: everyone needs a mode before "Find midpoint" works | M5 | S | 🔜 |
| Step bar on 07 | F | S | ✅ |

### Eashvar
| Task | From | Size | Status |
|---|---|---|---|
| **Intuitive check**: walk through 01 → 12 as a new user, list anything confusing, share it so each owner fixes their own | M7 | M | 🔜 |
| **Test with different groups**: two separate hangouts with different members, checking they don't mix | M6 | M | 🔜 |
| **Validation on 11 and 12**: can't vote twice, can't close a vote with no votes | M5 | S | 🟡 vote button is disabled when you can't vote; check closing with no votes |
| **Fix the smoke test** for the new headings on 01, 02, 03, 05, 09 and the main flow ("Sign up" link is gone from 01). 6 tests fail on `main` | C | S | 🔜 |
| Step bar on 11 and 12 | F | S | ✅ |

### Everyone
- Your own pages work on a phone and make sense without explanation. [M4] [M7]
- Validation on your own forms and buttons. [M5]
- Swap in Hugo's spinner and banners once they're merged. [F]
- Fix whatever Eashvar's intuitive check finds on your pages. [M7]
- **Running the tests with Supabase keys in `.env.local`:** the login guard sends every test to `/login`. Blank the keys for the run: `VITE_SUPABASE_URL= VITE_SUPABASE_PUBLISHABLE_KEY= npx playwright test`

## Order that matters

1. **History:** ~~Matrix saves it~~ ✅ → Ryan shows it on the dashboard → Hugo suggests from it. **Both are unblocked now.**
2. **Shared UI:** Hugo's spinner and banners → everyone swaps them in.
3. **Figma:** ~~Ryan updates it~~ ✅ → team walkthrough → Eashvar's intuitive check on the real app.
4. **Proposal:** Ryan and Surya edit it → send it to the prof.

## Workload check (what's left)

| Person | Open tasks |
|---|---|
| Ryan | Proposal, walkthrough, Past tab (+ swap spinner when Hugo's ready) |
| Surya | Proposal |
| Matrix | Finish validation, Invitation card, `matchScore.js` |
| Hugo | Spinner and banners, past places on 09, map size on 09, responsive lead and nav bar |
| Nicole | `pickFairestArea()`, validation on 07 |
| Eashvar | Intuitive check, two-group test, vote validation, smoke test |

**Hugo has the most left, and his spinner and banners block everyone.** Surya has the least. Surya could take the **responsive lead** (checking every page and reporting) so Hugo can focus on the shared components and page 09.
