# Team to-do

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

### Ryan
| Task | From | Size |
|---|---|---|
| Edit the proposal (accept the use-case regrouping, fold past places into recommendations, replace "Responsive and validated" with a Design principles section) and **send it to the prof**, with Surya | F, M2 | M |
| ~~**Update the Figma**: regroup frames by use case, rename "Midway" to "Fairpoint", show the step bar on frames 06–12, match what's been built. Then run a team walkthrough of it.~~ **Done 11 Oct.** Walkthrough notes and open questions in `docs/figma-walkthrough.md` | F | L |
| **"Past" tab on 04 Dashboard**: list past hangouts and where the group went (after Matrix saves history) | M3 | M |
| Responsive and intuitive check on 04 and 08; swap in Hugo's spinner and banners; "Show more" on Crowds right now | M4, M7, F | M |
| Step bar (`HangoutBar`) on 08, with loading and error states like page 06 | F | S |
| Login guard and the name in the dashboard greeting (code ready for review) | C | S |

### Surya
| Task | From | Size |
|---|---|---|
| **"Use my location" on 06**: the browser's location fills in your starting point (OneMap turns it into an address) | M1 | M |
| Proposal edits and sending it, with Ryan | M2 | M |
| **Validation on 06**: postal code must be 6 digits, the point must be in Singapore, clear message when search fails | M5 | S |
| *(Optional)* Show the use-case groups in `HangoutBar`, e.g. "Get there · Choose · Decide" | F | S |

### Matrix
| Task | From | Size |
|---|---|---|
| **Save hangout history (do this first, Ryan and Hugo depend on it)**: store the final spot when a hangout is done (`supabase/schema.sql`, `services/hangouts.js`), and make `getMyHangouts()` real | M3, C | M |
| **Different groups**: one user can create, join and switch between several hangouts with different people (invite links, membership) | M6 | L |
| **Form validation** on login, sign up, preferences and create hangout: required fields, email format, password length, dates not in the past | M5 | M |
| Decide the Invitation card on the dashboard (there's no invitations table) | C | S |
| Test Ryan's login guard with real Supabase keys | C | S |

### Hugo
| Task | From | Size |
|---|---|---|
| **Shared spinner and banner components** in `src/components/ui/` (do these early, everyone swaps them in) | F | M |
| **Suggest past places on 09**: a "You've been here before" badge, or rank places the group liked higher (after Matrix saves history) | M3 | M |
| **Map on 09 big enough to use**: tall enough to tap pins on a phone, not squeezed beside the list on a laptop (page 06's map: right side on laptop, at least 640 px tall; 60% of screen height on phone) | M4 | M |
| **Responsive lead**: check every page at 576 / 768 / 992 / 1200 and fix shared styles in `tokens.css` and the nav bar (including "+ New hangout" and the avatar from the Figma) | M4 | L |
| Step bar on 09 and 10, and a fixed `<h1>` on 10 | F, C | S |

### Nicole
| Task | From | Size |
|---|---|---|
| **Midpoint for any group**: `pickFairestArea()` works for 2 to N people and skips anyone without a starting point | M6 | M |
| **Validation on 07**: everyone needs a mode before "Find midpoint" works | M5 | S |
| Step bar on 07 | F | S |

### Eashvar
| Task | From | Size |
|---|---|---|
| **Intuitive check**: walk through 01 → 12 as a new user, list anything confusing (labels, empty states, error messages, back buttons), share it so each owner fixes their own | M7 | M |
| **Test with different groups**: an end-to-end test with two separate hangouts and different members, checking they don't mix | M6 | M |
| **Validation on 11 and 12**: can't vote twice, can't close a vote with no votes | M5 | S |
| **Fix the smoke test** for the new headings on 01, 02, 03, 05 and 09 (6 tests fail on `main`) | C | S |
| Step bar on 11 and 12 | F | S |

### Everyone
- Your own pages work on a phone and make sense without explanation. [M4] [M7]
- Validation on your own forms and buttons. [M5]
- Swap in Hugo's spinner and banners once they're merged. [F]
- Fix whatever Eashvar's intuitive check finds on your pages. [M7]

## Order that matters

1. **History:** Matrix saves it → Ryan shows it on the dashboard → Hugo suggests from it. Matrix's part comes first.
2. **Shared UI:** Hugo's spinner and banners → everyone swaps them in.
3. **Figma:** Ryan updates it (done 11 Oct) → team walkthrough → Eashvar's intuitive check on the real app.
4. **Proposal:** Ryan and Surya edit it → send it to the prof.

## Workload check

| Person | Tasks | Roughly |
|---|---|---|
| Ryan | 6 | 1 L, 3 M, 2 S |
| Surya | 4 | 2 M, 2 S |
| Matrix | 5 | 1 L, 2 M, 2 S |
| Hugo | 5 | 1 L, 3 M, 1 S |
| Nicole | 3 | 1 M, 2 S |
| Eashvar | 5 | 2 M, 3 S |

Hugo and Matrix carry the most, and Nicole the least. If Hugo falls behind, Nicole could take the **responsive lead** (checking every page and reporting), leaving Hugo to fix `tokens.css` and the nav bar.
