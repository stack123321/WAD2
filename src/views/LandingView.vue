<script setup>
// 01 Landing
// Owner: Matrix · Vet by: Hugo
// Figma frame "01". Hero with a static map preview, quick stats and the three feature cards.

// Friends shown on the hero map. x/y are positions in the SVG's 600×460 viewBox.
const friends = [
  { initial: 'N', x: 300, y: 105, color: 'var(--landing-pink)' },
  { initial: 'H', x: 470, y: 95, color: 'var(--landing-blue)' },
  { initial: 'S', x: 560, y: 260, color: 'var(--fp-accent)' },
  { initial: 'R', x: 105, y: 325, color: 'var(--landing-purple)' },
]
const midpoint = { x: 318, y: 215 }

const stats = [
  { value: '6 friends', label: 'one fair spot' },
  { value: '< 30 min', label: 'average travel' },
  { value: '1 vote', label: 'to decide' },
]

const votes = [
  { name: 'Brew & Board Café', votes: 3, share: 60, color: 'var(--fp-primary)' },
  { name: 'Bishan Park cycling', votes: 2, share: 40, color: 'var(--fp-accent)' },
]

const features = [
  {
    letter: 'M',
    tone: 'teal',
    title: 'Fair midpoint',
    text: 'Balances everyone’s travel time by MRT, bus, car or on foot, not just straight-line distance.',
  },
  {
    letter: 'W',
    tone: 'amber',
    title: 'Weather & crowd aware',
    text: 'Live forecasts and a crowd heat map steer the group away from rain and packed places.',
  },
  {
    letter: 'V',
    tone: 'violet',
    title: 'Decide together',
    text: 'Shortlist cafes and activities, then vote as a group. No more endless chat threads.',
  },
]
</script>

<template>
  <main class="landing">
    <div class="container">
      <section class="hero">
        <div class="hero__copy">
          <span class="pill">
            <span class="pill__dot" aria-hidden="true"></span>
            Built for friend groups in Singapore
          </span>

          <h1 class="hero__title">Meet halfway.<br />Hang out better.</h1>

          <p class="hero__lead">
            Add where everyone’s coming from. Fairpoint finds a fair meeting spot, checks the
            weather and crowds, suggests cafes and activities nearby, and lets your group vote.
          </p>

          <div class="hero__actions">
            <RouterLink class="btn btn-primary btn-lg cta" :to="{ name: 'create-hangout' }">
              Start a hangout
            </RouterLink>
            <a class="btn btn-light btn-lg cta cta--ghost" href="#how-it-works">See how it works</a>
          </div>

          <dl class="stats">
            <div v-for="stat in stats" :key="stat.label" class="stats__item">
              <dt class="stats__value">{{ stat.value }}</dt>
              <dd class="stats__label">{{ stat.label }}</dd>
            </div>
          </dl>
        </div>

        <div
          class="hero__visual"
          aria-label="Preview: four friends meeting at a fair midpoint in Bishan"
          role="img"
        >
          <svg
            class="map"
            viewBox="0 0 600 460"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            <defs>
              <radialGradient id="heat-red">
                <stop offset="0%" stop-color="var(--fp-accent)" stop-opacity="0.75" />
                <stop offset="100%" stop-color="var(--fp-accent)" stop-opacity="0" />
              </radialGradient>
              <radialGradient id="heat-amber">
                <stop offset="0%" stop-color="var(--landing-amber)" stop-opacity="0.7" />
                <stop offset="100%" stop-color="var(--landing-amber)" stop-opacity="0" />
              </radialGradient>
            </defs>

            <!-- Water and parks -->
            <ellipse cx="420" cy="-10" rx="230" ry="60" class="map__water" />
            <ellipse cx="300" cy="490" rx="420" ry="90" class="map__water" />
            <rect x="35" y="100" width="95" height="65" rx="30" class="map__park" />
            <rect x="490" y="120" width="80" height="80" rx="36" class="map__park" />
            <rect x="80" y="270" width="80" height="70" rx="30" class="map__park" />
            <rect x="350" y="285" width="80" height="60" rx="26" class="map__park" />

            <!-- Minor roads -->
            <g class="map__road">
              <path d="M0 130 L600 110" />
              <path d="M0 250 L600 205" />
              <path d="M0 320 L600 290" />
              <path d="M290 0 L300 460" />
              <path d="M180 0 L155 460" />
              <path d="M600 330 L470 360" />
            </g>

            <!-- Major roads -->
            <g class="map__road map__road--major">
              <path d="M80 0 C95 120 130 260 75 460" />
              <path d="M500 0 C470 150 470 250 520 460" />
              <path d="M0 210 C150 190 260 185 600 180" />
            </g>

            <!-- Crowd heat -->
            <circle cx="305" cy="205" r="120" fill="url(#heat-red)" />
            <circle cx="440" cy="160" r="70" fill="url(#heat-red)" />
            <circle cx="165" cy="300" r="70" fill="url(#heat-amber)" />
            <circle cx="350" cy="145" r="55" fill="url(#heat-amber)" />

            <!-- Routes to the midpoint -->
            <line
              v-for="f in friends"
              :key="`route-${f.initial}`"
              :x1="f.x"
              :y1="f.y"
              :x2="midpoint.x"
              :y2="midpoint.y"
              :stroke="f.color"
              class="map__route"
            />

            <!-- Midpoint -->
            <circle :cx="midpoint.x" :cy="midpoint.y" r="38" class="map__halo" />
            <circle :cx="midpoint.x" :cy="midpoint.y" r="10" class="map__mid" />

            <!-- Friends -->
            <g v-for="f in friends" :key="`pin-${f.initial}`" class="map__pin">
              <circle :cx="f.x" :cy="f.y" r="15" :fill="f.color" />
              <text :x="f.x" :y="f.y" dy="0.35em" text-anchor="middle">{{ f.initial }}</text>
            </g>
          </svg>

          <div class="float weather">
            <svg width="34" height="28" viewBox="0 0 34 28" aria-hidden="true">
              <circle cx="12" cy="11" r="8" fill="var(--landing-amber)" />
              <path
                d="M10 25a6 6 0 0 1 1-12 8 8 0 0 1 15 2 5 5 0 0 1 1 10z"
                fill="var(--landing-cloud)"
              />
            </svg>
            <div>
              <div class="weather__temp">29°C · Partly cloudy</div>
              <div class="weather__meta">Bishan · Fri 7 PM</div>
            </div>
          </div>

          <div class="midpoint-label">Fair midpoint · Bishan</div>

          <div class="float vote">
            <div class="vote__title">Group vote</div>
            <div v-for="v in votes" :key="v.name" class="vote__row">
              <div class="vote__line">
                <span>{{ v.name }}</span>
                <span class="vote__count" :style="{ color: v.color }">{{ v.votes }} votes</span>
              </div>
              <div class="vote__bar">
                <span :style="{ width: `${v.share}%`, background: v.color }"></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" class="features">
        <article v-for="f in features" :key="f.title" class="feature">
          <span class="feature__icon" :class="`feature__icon--${f.tone}`">{{ f.letter }}</span>
          <h2 class="feature__title">{{ f.title }}</h2>
          <p class="feature__text">{{ f.text }}</p>
        </article>
      </section>
    </div>
  </main>
</template>

<style scoped>
.landing {
  /* Illustration-only colours for the map preview */
  --landing-pink: #d6528f;
  --landing-blue: #4a7fe8;
  --landing-purple: #7056e0;
  --landing-amber: #f2b33d;
  --landing-cloud: #d5dbe6;

  padding-block: 3rem 5rem;
}

/* Hero */
.hero {
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  gap: 3rem;
  align-items: center;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--fp-primary) 12%, transparent);
  color: var(--fp-primary-dark);
  font-size: 0.85rem;
  font-weight: 600;
}

.pill__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--fp-primary);
}

.hero__title {
  margin: 1.5rem 0 1.25rem;
  font-size: clamp(2.5rem, 5.5vw, 4rem);
  font-weight: 800;
  line-height: 1.02;
  letter-spacing: -0.035em;
}

.hero__lead {
  max-width: 34rem;
  color: var(--fp-muted);
  font-size: 1.1rem;
  line-height: 1.6;
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-block: 2rem 2.5rem;
}

.cta {
  padding: 0.75rem 1.4rem;
  font-size: 1rem;
  font-weight: 600;
}

.cta--ghost {
  background: var(--fp-surface);
  border-color: var(--fp-border);
}

.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 2.25rem;
  margin: 0;
}

.stats__value {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.stats__label {
  margin: 0;
  color: var(--fp-muted);
  font-size: 0.85rem;
}

/* Map preview */
.hero__visual {
  position: relative;
  aspect-ratio: 600 / 460;
  border-radius: calc(var(--fp-radius) * 1.5);
  overflow: hidden;
  box-shadow: 0 20px 50px rgb(0 0 0 / 0.1);
  background: #e9ece4;
}

.map {
  display: block;
  width: 100%;
  height: 100%;
}

.map__water {
  fill: #cfdfe6;
}

.map__park {
  fill: #cfe0c3;
  opacity: 0.8;
}

.map__road path {
  fill: none;
  stroke: var(--fp-surface);
  stroke-width: 5;
}

.map__road--major path {
  stroke: #f2d48f;
  stroke-width: 8;
}

.map__route {
  stroke-width: 2.5;
  stroke-dasharray: 6 5;
}

.map__halo {
  fill: rgb(0 0 0 / 0.12);
}

.map__mid {
  fill: var(--fp-primary);
  stroke: var(--fp-surface);
  stroke-width: 4;
}

.map__pin circle {
  stroke: var(--fp-surface);
  stroke-width: 3;
  filter: drop-shadow(0 2px 3px rgb(0 0 0 / 0.2));
}

.map__pin text {
  fill: var(--fp-surface);
  font-size: 12px;
  font-weight: 700;
}

.float {
  position: absolute;
  background: var(--fp-surface);
  border-radius: var(--fp-radius-sm);
  box-shadow: var(--fp-shadow);
}

.weather {
  top: 5%;
  left: 4%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
}

.weather__temp {
  font-size: 0.85rem;
  font-weight: 700;
}

.weather__meta {
  color: var(--fp-muted);
  font-size: 0.75rem;
}

.midpoint-label {
  position: absolute;
  top: 53%;
  left: 53%;
  transform: translateX(-50%);
  padding: 0.35rem 0.65rem;
  border-radius: 6px;
  background: var(--fp-ink);
  color: var(--fp-surface);
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.vote {
  right: 4%;
  bottom: 5%;
  width: min(40%, 230px);
  padding: 1rem;
}

.vote__title {
  margin-bottom: 0.6rem;
  font-size: 0.85rem;
  font-weight: 700;
}

.vote__row + .vote__row {
  margin-top: 0.7rem;
}

.vote__line {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.75rem;
}

.vote__count {
  font-weight: 600;
  white-space: nowrap;
}

.vote__bar {
  height: 5px;
  margin-top: 0.4rem;
  border-radius: 999px;
  background: var(--fp-bg);
  overflow: hidden;
}

.vote__bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
}

/* Features */
.features {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
  margin-top: 3.5rem;
  scroll-margin-top: 2rem;
}

.feature {
  padding: 1.5rem;
  background: var(--fp-surface);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
}

.feature__icon {
  display: inline-grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: var(--fp-radius-sm);
  font-weight: 700;
}

.feature__icon--teal {
  background: color-mix(in srgb, var(--fp-primary) 12%, transparent);
  color: var(--fp-primary);
}

.feature__icon--amber {
  background: color-mix(in srgb, var(--landing-amber) 22%, transparent);
  color: #c98a12;
}

.feature__icon--violet {
  background: color-mix(in srgb, var(--landing-purple) 15%, transparent);
  color: var(--landing-purple);
}

.feature__title {
  margin: 1.25rem 0 0.75rem;
  font-size: 1.1rem;
  font-weight: 700;
}

.feature__text {
  margin: 0;
  color: var(--fp-muted);
  font-size: 0.9rem;
  line-height: 1.55;
}

/* Responsive */
@media (max-width: 991.98px) {
  .hero {
    grid-template-columns: 1fr;
  }

  .features {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 575.98px) {
  .weather,
  .vote {
    transform: scale(0.75);
  }

  .weather {
    transform-origin: top left;
  }

  .vote {
    transform-origin: bottom right;
    width: 55%;
  }
}
</style>
