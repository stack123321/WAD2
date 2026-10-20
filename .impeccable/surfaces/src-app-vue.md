---
version: 1
slug: "src-app-vue"
primary_target: "src/App.vue"
related_targets: ["src/views/LandingView.vue","src/views/DashboardView.vue","src/views/VoteView.vue","src/views/FinalPlanView.vue","src/styles/tokens.css"]
---

# Fairpoint app: Direction C (whole-app implementation of a given design)

Scope: every page 01–12 plus auth, friends, groups, crowds. Mode: Operate on working pages; Persuade on the landing page (01). Audience: groups of 3–8 Singapore uni/poly friends on phones, arriving from a group-chat link. Job: agree on a fair spot fast. Constraints: Vue 3 + Bootstrap 5 as taught, 375px phones, 44px tap targets, the name stays Fairpoint, every page keeps its function.

Source of truth: the user's design canvas "Fairpoint Home Redesign" (claude.ai artifact f8159cda-4429-413c-a09e-f1a9bf337608), pages "Desktop · 1440", "Tablet · 834", "Mobile · 390", and its "Design system — follow this" board. Pinned by the user; no direction round.

## Direction contract

THESIS: One headline and one loud action per screen. Every page opens with a big teal Fraunces title ending in a full stop that says what the page is for in four words or fewer, and offers one black pill to tap. Refuses busy dashboards of equal-weight cards and shadowed boxes.

OWN-WORLD: White pages; soft grey panels (#F5F5F3, 28px radius, no shadow) and hairlines (#E6E6E6) do the separating. Teal #0E7C6B means Fairpoint (logo, headlines, selected chips, progress, done steps), never body text. Black pill = the one primary action per section; grey pill (#E4E4E2) = secondary and repeated list actions; teal pill only for "New hangout" in the nav. Coral only as a dot or tint for deadlines. Fraunces 700–900 for headlines and big numbers, DM Sans for everything read or tapped. Member avatars: white initials on the member's colour.

STORY: The visitor reads what the page is for in one glance, sees everyone's trip side by side, taps the single obvious action, and moves to the next step.

FIRST VIEWPORT: Landing: centred giant "Meet in the middle." over a quiet hero, one grey and one black pill. Inside a hangout (phone): navbar, grey step band with the hangout name and a six-segment progress bar, then the page's teal headline and its main action.

SIGNATURE INTERACTION AND MOTION: Calm, physical press feedback on every pill (a quick scale-down on press, ease-out), progress bars and vote tallies that grow into place once when the page opens, chips and toggles that change colour smoothly. All of it is skipped under reduced motion. No decorative motion. One signature moment on the landing (user-requested, after animejs.com): the hero pins while you scroll, the headline lifts away, each friend's route draws across a map of Singapore to the fair spot, the map zooms in on it and a caption states the gap; scrubbed by scroll (anime.js onScroll sync), shown as a still under reduced motion.

FORM: The user's pinned design, Direction C ("Tinder — bold type, nothing else" home direction extended to every page). No roll was made for this direction: the user supplied it. (The seed file under .impeccable/questions/seeds belongs to the separate Loteria Night proposal on branch design/radical-redesign.) seed: none (unavailable)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved
- The landing hero video was tried (a teal globe) and replaced by the user with the scroll-driven map scene.
- Each file's owner must OK their page's restyle before this merges.
