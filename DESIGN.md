---
name: Fairpoint
description: Find the fairest place for your group to meet.
colors:
  primary: "#0e7c6b"
  primary-dark: "#0a5f52"
  tint: "#e8f3f0"
  accent: "#f2684a"
  accent-text: "#a3341b"
  accent-tint: "#fde7e1"
  bg: "#ffffff"
  surface: "#f5f5f3"
  raised: "#ffffff"
  ink: "#111111"
  ink-hover: "#2a2a2a"
  muted: "#555555"
  faint: "#707070"
  border: "#e6e6e6"
  pill: "#e4e4e2"
  pill-hover: "#d9d9d7"
  chip-line: "#d4d4d2"
  disabled: "#8a8a8a"
  danger: "#b42318"
  on-dark-muted: "#c9c9c9"
  mint: "#5fd3c0"
  avatar-blue: "#3b6fd8"
  avatar-rust: "#c2410c"
  avatar-violet: "#6c63ff"
  avatar-ochre: "#a87900"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(4rem, 10.5vw, 10.5rem)"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(2.75rem, 6vw, 4.5rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  numeral:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "2.75rem"
    fontWeight: 900
    lineHeight: 1
    fontFeature: "tnum"
  body:
    fontFamily: "DM Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.5
  button:
    fontFamily: "DM Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.5
  label:
    fontFamily: "DM Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    letterSpacing: "0.14em"
rounded:
  sm: "16px"
  md: "28px"
  lg: "32px"
  pill: "999px"
spacing:
  pill-gap: "0.6rem"
  panel-gap: "1.5rem"
  card-padding: "1.75rem"
  page-inline: "clamp(1rem, 2.8vw, 2.5rem)"
  page-top: "4rem"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bg}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "0.7rem 1.4rem"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.ink-hover}"
    textColor: "{colors.bg}"
  button-primary-disabled:
    backgroundColor: "{colors.pill}"
    textColor: "{colors.disabled}"
  button-secondary:
    backgroundColor: "{colors.pill}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "0.7rem 1.4rem"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.pill-hover}"
    textColor: "{colors.ink}"
  button-brand:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.bg}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "0.7rem 1.4rem"
    height: "44px"
  button-brand-hover:
    backgroundColor: "{colors.primary-dark}"
    textColor: "{colors.bg}"
  button-lg:
    padding: "0.95rem 1.75rem"
    height: "56px"
  button-on-dark:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
  button-on-dark-hover:
    backgroundColor: "{colors.surface}"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 1.1rem"
    height: "56px"
  field-focus:
    backgroundColor: "{colors.raised}"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "1.75rem"
  card-outline:
    backgroundColor: "{colors.bg}"
    rounded: "{rounded.lg}"
    padding: "1.75rem"
  feature-card:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bg}"
    rounded: "{rounded.lg}"
    padding: "clamp(1.75rem, 4vw, 3rem)"
  status-pill:
    backgroundColor: "{colors.pill}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0.4rem 0.85rem"
  status-pill-live:
    backgroundColor: "{colors.accent-tint}"
    textColor: "{colors.accent-text}"
  status-pill-ok:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.primary-dark}"
  segmented-on:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bg}"
    rounded: "{rounded.pill}"
    height: "44px"
  progress-track:
    backgroundColor: "{colors.pill}"
    rounded: "{rounded.pill}"
    height: "10px"
  avatar:
    textColor: "{colors.bg}"
    rounded: "{rounded.pill}"
    size: "36px"
---

# Design System: Fairpoint

## Overview

**Creative North Star: "One Headline, One Pill"**

Every Fairpoint screen says what it is for in a single big teal Fraunces headline that ends in a full stop, then offers one black pill to tap. Everything else steps back: white pages, soft grey panels and hairlines do the separating, and DM Sans carries everything that is read or tapped. The system was built for a friend who just tapped a group-chat link on a 375px phone and needs to know the next move in one glance.

Density is low and deliberate. Sections breathe; the page's single loud moment is the headline, and the single loud action is the black pill. Depth comes from tone (white against #F5F5F3), never from shadows. Colour is rationed: teal belongs to Fairpoint itself (wordmark, headlines, selected state, progress, done steps) and coral appears only as a dot or a tint when a deadline is live.

This is Direction C, pinned by the user from their own design canvas. It refuses busy dashboards of equal-weight cards and shadowed boxes.

**Key Characteristics:**
- One teal Fraunces 800 headline per page, ending in a full stop.
- One black pill per section; grey pills for everything secondary.
- Flat grey panels (28px radius) and hairline outline cards; no shadows anywhere.
- Teal means Fairpoint; coral is only a deadline dot or tint.
- Big Fraunces numerals for dates, ranks and step numbers.
- Motion is press feedback, bars growing in once, and colour transitions; nothing decorative. The one exception is the landing hero's scroll scene (below).

## Colors

White ground, near-black ink, one brand teal, a coral used only as a signal, and warm greys that do all the structural work.

### Primary
- **Fairpoint Teal** (primary): the brand. Wordmark, every page headline, the active nav link and its underline, selected chips and toggles, progress fills, done steps in the step bar, the leading vote bar, links and focus rings. Never body text.
- **Deep Teal** (primary-dark): hover state for teal links and the nav pill; text sitting on the teal tint.
- **Teal Tint** (tint): the background for "confirmed" and "today" states, the leading vote candidate, success alerts and text selection.

### Secondary
- **Deadline Coral** (accent): the dot inside a live-deadline status pill. Nothing else.
- **Coral Ink** (accent-text) and **Coral Tint** (accent-tint): text and fill for the live-deadline pill and warning alerts.

### Tertiary
- **Member colours** (avatar-blue, avatar-rust, avatar-violet, avatar-ochre, plus teal): each member's avatar circle, always with white initials.
- **Mint** (mint): the leading bar inside the black feature card only, where teal would sink into the black.

### Neutral
- **Paper White** (bg): every page background, the text on black pills and the black feature card.
- **Soft Grey Panel** (surface): panels, the hangout step band, fields on white, segmented-control tracks.
- **Raised White** (raised): fields and chips sitting on a grey panel; a field's focused fill.
- **Ink** (ink) and **Ink Hover** (ink-hover): text, the primary pill, the black feature card, the current step.
- **Muted** (muted): secondary text, meta lines, leads.
- **Faint** (faint): small caps labels, table column headers, timestamps, placeholders.
- **Hairline** (border): outline cards, the nav's bottom rule, section dividers, dropdown edges.
- **Pill Grey** (pill) and **Pill Grey Hover** (pill-hover): secondary pills, empty progress tracks, status pill default.
- **Chip Line** (chip-line): unselected chip outlines, off toggles, empty step segments, unranked numerals.
- **Disabled** (disabled): disabled pill text, the neutral status dot.
- **Danger** (danger): destructive actions and form errors.
- **On-Dark Muted** (on-dark-muted): secondary text on the black feature card.

### Named Rules
**The Teal Means Fairpoint Rule.** Teal marks the brand and the state of the plan: headlines, wordmark, selected, progress, done. It is never used for body text or decoration.

**The Coral Is a Signal Rule.** Coral only ever appears as a dot or a tint for a live deadline. Never a button, never a heading, never a border.

## Typography

**Display Font:** Fraunces (with Georgia, serif), weights 700 to 900
**Body Font:** DM Sans (with system-ui, -apple-system, Segoe UI, sans-serif), weights 400 to 700

**Character:** A heavy, warm optical-size serif shouts the one thing that matters; a plain geometric sans handles every word that is read or tapped. The contrast is the hierarchy.

### Hierarchy
- **Display** (Fraunces 800, clamp(4rem, 10.5vw, 10.5rem), line-height 0.95): the landing hero "Meet in the middle." and the final plan's spot name. Centred, teal.
- **Headline** (Fraunces 800, clamp(2.75rem, 6vw, 4.5rem), line-height 1): the one page headline (h1) on every other page. Teal, balanced wrap, ends in a full stop.
- **Title** (Fraunces 700, 1.5rem to 2rem, line-height 1.2): section and card titles (h2, h3), the hangout name in the step band. Ink, not teal.
- **Numeral** (Fraunces 800 to 900, 2.75rem to 6rem, line-height 1): big numbers: the landing's step numbers, a hangout card's day, vote ranks, step circles. Tabular figures.
- **Body** (DM Sans 400, 1.0625rem, line-height 1.5): everything read. Leads run larger (1.125 to 1.3rem) in muted ink, capped near 40rem.
- **Button** (DM Sans 700, 1rem; 1.15 to 1.3rem on large pills): every pill and text link action.
- **Label** (DM Sans 700, 0.75rem, letter-spacing 0.14em, uppercase, faint): inline labels ("Step 3 of 6 ·", a card's month) and table column headers only.

### Named Rules
**The One Headline Rule.** Each page has exactly one headline: Fraunces 800, teal, ending in a full stop. When the headline is a dynamic name (a spot, a group), the full stop is a separate `aria-hidden` "." so screen readers don't read it.

**The No Kicker Rule.** Small caps labels never sit above a heading. They live inline beside a value or at the top of a table column.

## Layout

Pages sit in a centred column up to 1360px wide with fluid side padding (clamp(1rem, 2.8vw, 2.5rem)), matching the nav and the step band so all three edges line up. Working pages open with about 4rem of top space before the headline. Inside a page, panels stack with a 1.5rem gap and wrap into a main column (flex-basis 640px) and an aside (340px) on wide screens, falling to one column on phones. Pill groups sit 0.6rem apart and wrap and centre under centred headlines.

Breakpoints are Bootstrap's (576, 768, 992, 1200px). Below 768px the nav drops to 64px with the links folded behind a round black menu button, and the step band collapses to "Step x of 6" with a six-segment bar and an "All steps" toggle. The landing stretches sections generously (7rem to 8rem vertical padding on desktop, about 4.5rem on phones).

**The 375 Rule.** Every page works on a 375px phone with no sideways scroll, and every tap target is at least 44px tall.

## Elevation & Depth

Fairpoint is flat. There are no shadows (the shadow token is `none`); depth is tonal. White pages hold Soft Grey panels, white fields sit on grey panels, and where a panel would be too heavy a 1px hairline outline card does the separating instead. The only non-flat element is the black feature card, which stands out by inversion, not by lift. Focus is shown with a teal outline or ring, never a drop shadow.

### Named Rules
**The No-Shadow Rule.** Nothing casts a shadow. Separate with white space, a grey panel, or a hairline.

**The One Black Card Rule.** A page carries at most one black feature card: the thing the user most needs to act on (the landing's vote panel, the dashboard's "plan something new" banner, the vote page's host panel).

## Shapes

Generous, friendly rounding throughout. Panels and cards use 28px (md) or 32px (lg) corners; fields, dropdowns, alerts, map frames and thumbnails use 16px (sm); every button, chip, status pill, progress bar, segmented control and avatar is a full pill or circle (999px). Borders are either absent or a 1px hairline; a selected or leading item gets a 2px teal outline. Icons are inline SVG with round caps and joins, 14 to 20px, drawn in `currentColor`.

## Components

### Buttons
Pills that give a little under your finger.
- **Shape:** full pill (999px), no border, minimum 44px tall (56px for large).
- **Primary:** black pill with white text, the one main action per section.
- **Secondary:** grey pill with ink text for secondary actions and for actions repeated down a list (a hangout card's "Open", a candidate's "Vote").
- **Brand:** teal pill with white text, used as an action only in the nav ("New hangout", "Log in").
- **On the black feature card:** the card's one action inverts to a white pill with ink text.
- **Text link:** teal, bold, no underline, 44px tall, for back links, skip, and invite-style actions.
- **Hover / Focus / Press:** hover darkens the fill; focus shows a 3px teal ring; on press the pill scales to 0.97 with background and colour easing over 160ms. Disabled pills turn grey with grey text at full opacity.

### Chips and Toggles
- **Style:** pill chips; white on a grey panel, outlined in Chip Line when unselected.
- **State:** selected fills teal. In the same language, the vote button for the candidate you picked turns into a teal pill reading "Your vote" with an SVG tick: a teal fill on a control means "selected", not "act here". Switches are 52 by 32px pills, Chip Line off, teal on.
- **Segmented control:** a grey track with the chosen side as a black pill (Upcoming / Past, Log in / Sign up).

### Status Pills
- Pill with an 8px dot and tinted fill, 0.875rem bold text. Default: grey fill, grey dot. Live deadline: Coral Tint fill, coral dot, Coral Ink text. Confirmed or done: Teal Tint fill, teal dot, Deep Teal text.

### Cards / Containers
- **Corner Style:** 28px for grey panels, 32px for outline cards and the feature card.
- **Background:** Soft Grey panels by default; transparent with a hairline for side and detail cards; Ink for the single feature card.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** none on grey panels; 1px hairline on outline cards; 2px teal on the leading candidate, which also sits on the Teal Tint.
- **Internal Padding:** 1.75rem typical, up to clamp(2rem, 5vw, 4rem) on landing panels.

### Inputs / Fields
- **Style:** 56px tall, Soft Grey fill, 2px transparent border, 16px radius, weight 500 text, faint placeholder.
- **Focus:** fill turns white and the border turns teal; no glow.
- **Error / Disabled:** Danger border and message for invalid input.

### Navigation
- White bar with a hairline bottom rule, 88px tall (64px on phones). The "fairpoint" wordmark in Fraunces 900 teal at left; links in DM Sans 500 at 1.125rem in ink; the active link turns teal, bold, with a 2px teal underline. At right: a round grey initial button (log out) and the teal pill. On phones the links fold behind a round black menu button with an SVG two-line icon.

### Hangout Step Band
- The grey band under the nav on every hangout page: hangout name (Fraunces 700) and date, six numbered steps in 32px circles (done: teal with an SVG tick; current: black; ahead: white with a Chip Line ring), the member avatar stack and the black Invite pill. On phones: "Step 3 of 6 · Midpoint" with a six-segment bar (done teal, current black, ahead Chip Line).

### Progress and Tally Bars
- 10px pill tracks in Pill Grey with an ink fill, teal for the leading or voted segment. Bars grow from the left once when the page opens (700ms ease-out) and are static under reduced motion.

### Member Avatars
- Circles in the member's colour with white bold initials, overlapping by 6 to 8px with a ring in the background colour behind them.

## Do's and Don'ts

### Do:
- **Do** give every page exactly one headline: Fraunces 800, teal, ending in a full stop; a dynamic name gets an `aria-hidden` ".".
- **Do** use one black pill per section, grey pills for secondary and repeated list actions, and text links for back, skip and invite.
- **Do** keep the teal pill as an action to the nav only; elsewhere teal fills mean "selected".
- **Do** separate with flat Soft Grey panels (#F5F5F3, 28px radius) or hairline outline cards.
- **Do** draw icons as inline SVG in `currentColor`.
- **Do** write component styles in `<style scoped>` using `var(--fp-*)` tokens; `src/styles/tokens.css` is the only global CSS (owner: Hugo).
- **Do** keep every tap target at least 44px and every page free of sideways scroll at 375px.
- **Do** limit motion to pill press feedback, bars growing in once, and colour transitions, all switched off under `prefers-reduced-motion`. The single exception is the landing hero (`src/components/landing/HeroScroll.vue`): a pinned scroll scene where friends' routes draw across a map of Singapore and it zooms into the fair spot, driven by scroll with anime.js `onScroll` (sync). Under reduced motion it shows as a still: headline, finished map, caption. anime.js is outside the course and is flagged for the team.

### Don't:
- **Don't** use shadows on anything.
- **Don't** put more than one black feature card on a page.
- **Don't** use teal for body text, or coral for anything but a deadline dot or tint.
- **Don't** put a small caps label above a heading; use it only for inline labels and table column headers.
- **Don't** use text glyphs as icons (★ → ✓).
- **Don't** hard-code hex values in components.
- **Don't** add decorative motion.
