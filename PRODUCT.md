# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Groups of 3–8 university and polytechnic students in Singapore planning a casual meet-up (dinner after
class, a study session, a weekend hangout). They use Fairpoint mostly on their phones, usually arriving
from a link shared in a group chat. One person (the host) creates the hangout and invites the rest;
friends join from the invite link, add where they're coming from and how they're travelling, browse
spots, vote and get the plan.

## Product Purpose

Friend groups struggle to agree where to meet, and whoever lives furthest usually ends up with the long
trip. Fairpoint finds an area that is fair for everyone, helps the group pick a specific spot there, and
sends everyone away with the same plan: the spot, their own route and leave-by time, and a backup.
Success is a group that settles on a place quickly without anyone feeling short-changed.

## Positioning

Fairness, not convenience for one person. By default (`optimise_for: 'fairest'`) Fairpoint keeps both the
longest trip and the gap between the longest and shortest trips small, rather than just minimising the
average. It shows each person why the result is fair to them: their own travel time next to the group's.
It is Singapore-specific: MRT/bus/car/walk travel times, LTA crowd levels at MRT stations, NEA weather and
haze, OneMap addresses. Times are in SGT and money in SGD.

## Operating Context

The journey follows numbered pages:

1. Sign up and set preferences (01–03): activities, dietary needs, budget, max travel time,
   indoor-if-rain, avoid crowds.
2. My hangouts (04): upcoming and past hangouts, pinned hangouts, friends to hang out with, crowds and
   weekly weather. The host creates a hangout and invites friends (05, invites on 06).
3. Get there (06–08): everyone adds a starting point (06), picks a travel mode (07), and Fairpoint picks
   the fairest MRT station as the midpoint, with a crowd heat map and weather (08).
4. Choose (09–10): nearby spots ranked for the group, filtered and shortlisted (max 3 per person), with
   details per spot.
5. Decide (11–12): the host starts the vote, everyone votes, ties are settled by a spin of a wheel, and
   everyone gets the final plan.

Also: a Friends page, permanent friend groups with their own chat (/groups), a crowds page (/crowds),
and a group chat inside each hangout. A step bar (Get there · Choose · Decide) sits on every hangout page.
Demo mode works with no keys using sample data ("Friday dinner after class", "Saturday study session").

## Capabilities and Constraints

- Vue 3 with the Composition API (`<script setup>`, `ref`, `computed`), Vue Router, Pinia, Supabase
  (Postgres, Auth, Realtime), Leaflet maps on OneMap tiles. Built and presented as an IS216 course project:
  keep Bootstrap 5 and Vue as the course taught it; no Tailwind or UI component libraries.
- Every page must work on a 375px phone: no sideways scrolling, buttons at least 44px tall, readable text.
- Six owners, one per page or feature (see README "Who owns what"); a redesign touching shared files or
  other people's pages is a proposal that each owner agrees to.
- Real data only on screen in demo mode is sample data marked "(sample data)" / "sample".

## Brand Commitments

The name stays **Fairpoint**. The logo and wordmark may change; no other brand assets exist yet.

## Evidence on Hand

None: no logo, photographs, testimonials, user numbers or press. Future work must not invent quotes,
customer counts, ratings or claims. Designs can use the app's own real content: maps, travel times,
crowd levels, weather and the sample hangouts.

## Product Principles

1. Fair to everyone, visibly: show each person their own trip next to the group's.
2. Fast agreement: every step moves the group closer to one decision with as little back-and-forth as
   possible.
3. Phone first, from a group-chat link: it must make sense to someone who just tapped an invite.
4. Singapore-real: MRT, SGT, SGD, local weather and crowds, not generic placeholders.
5. Honest: no fake data presented as real; sample data is labelled.

## Accessibility & Inclusion

WCAG-minded basics the team agreed on: real buttons and labels, no meaning carried by colour alone,
44px touch targets, keyboard and screen-reader friendly controls, readable text on phones.
