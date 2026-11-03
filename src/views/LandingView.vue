<script setup>
// 01 Landing
// Owner: Matrix
// Figma frame "01". Explains what Fairpoint is, Netflix-style: a hero with one button, then
// full-width sections down the page (how it works, features, FAQ, a final button).
// Logged-in users see their next hangout instead of the "how it works" steps.
// (Surya, improve/user-friendly-customised: one button, personal welcome card, feature rows, FAQ.)
// (Eashvar) The hero map is "You" and three friends, each with their trip time, instead of named
// people meeting in Bishan, so it fits anyone. It plays once it's on screen (on phones and tablets
// it's below the text): pins drop in, routes fade in, the midpoint appears, then the times and
// the label. A ring then keeps pulsing out of the midpoint. No motion if reduced motion is on.
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getMyHangouts, subscribeToMyHangouts } from '@/services/hangouts'
import { getProgress, getStatus } from '@/utils/hangoutStatus'

const auth = useAuthStore()

// You and three friends on the hero map. x/y are positions in the SVG's 600×460 viewBox, mins is
// each person's trip to the midpoint (all close together: that's what "fair" means).
// chipX is where their time sits: to the right of the pin, or to the left near the right edge.
const CHIP_WIDTH = 60
const friends = [
  { label: '', x: 300, y: 105, color: 'var(--landing-pink)', mins: 21 },
  { label: '', x: 470, y: 95, color: 'var(--landing-blue)', mins: 19 },
  { label: '', x: 560, y: 260, color: 'var(--fp-accent)', mins: 22 },
  { label: 'You', x: 105, y: 325, color: 'var(--landing-purple)', mins: 18 },
].map((f) => ({ ...f, chipX: f.x > 450 ? f.x - 24 - CHIP_WIDTH : f.x + 24 }))
const midpoint = { x: 318, y: 215 }
// the midpoint's circles grow from the midpoint itself (otherwise SVG shapes grow from the
// SVG's top-left corner and slide across the map)
const midpointOrigin = { transformOrigin: `${midpoint.x}px ${midpoint.y}px` }

// (Eashvar) Start the map's animation only once most of it is on screen. On every scroll (or window
// resize) we check where the map is; once 60% of it is above the bottom of the window, it plays
// (only once).
const heroMap = ref(null)
const mapPlaying = ref(false)

function checkMapInView() {
  const box = heroMap.value.getBoundingClientRect()
  if (box.top + box.height * 0.6 <= window.innerHeight) {
    mapPlaying.value = true
    window.removeEventListener('scroll', checkMapInView)
    window.removeEventListener('resize', checkMapInView)
  }
}

onMounted(() => {
  window.addEventListener('scroll', checkMapInView)
  window.addEventListener('resize', checkMapInView)
  checkMapInView() // on laptops the map is already on screen, so it plays straight away
})

onUnmounted(() => {
  window.removeEventListener('scroll', checkMapInView)
  window.removeEventListener('resize', checkMapInView)
  stopListening()
  clearTimeout(reloadTimer)
})

// "18–22 min", shown in the label on phones instead of the time tags
const allMins = friends.map((f) => f.mins)
const timeRange = `${Math.min(...allMins)}–${Math.max(...allMins)} min`

// Part (a) How it works (shown when logged out)
const steps = [
  {
    number: 1,
    title: 'Add where you’re coming from',
    text: 'Everyone searches their MRT, address or postal code.',
  },
  {
    number: 2,
    title: 'We find a fair spot',
    text: 'A meeting point where everyone’s travel time is about the same.',
  },
  {
    number: 3,
    title: 'Vote on a place and go',
    text: 'Shortlist cafes and activities nearby, then decide together.',
  },
]

// Part (b) Features: text on one side, a small picture on the other
const features = [
  {
    picture: 'map',
    title: 'A meeting spot that’s fair for everyone',
    text: 'Fairpoint balances everyone’s travel time by MRT, bus, car or on foot, not just straight-line distance. Nobody gets stuck with the long trip every time.',
  },
  {
    picture: 'weather',
    title: 'Weather & crowd aware',
    text: 'Live forecasts, haze levels and a crowd heat map steer your group away from rain and packed places.',
  },
  {
    picture: 'vote',
    title: 'Decide together',
    text: 'Shortlist cafes and activities near the midpoint, then vote as a group. No more endless chat threads.',
  },
]

// The small "mini map" picture for the first feature (positions in a 300×200 box)
const miniPins = [
  { x: 40, y: 40, color: 'var(--landing-pink)' },
  { x: 260, y: 55, color: 'var(--landing-blue)' },
  { x: 70, y: 170, color: 'var(--landing-purple)' },
  { x: 245, y: 160, color: 'var(--fp-accent)' },
]
const miniMidpoint = { x: 155, y: 105 }

const votes = [
  { name: 'Brew & Board Café', votes: 3, share: 60, color: 'var(--fp-primary)' },
  { name: 'Bishan Park cycling', votes: 2, share: 40, color: 'var(--fp-accent)' },
]

// Part (c) FAQ (Bootstrap accordion)
const faqs = [
  {
    question: 'Is Fairpoint free?',
    answer: 'Yes. Make an account and start planning straight away.',
  },
  {
    question: 'Do my friends need an account?',
    answer:
      'Yes. Send them your hangout’s invite link. They log in (or sign up) and join the hangout straight away.',
  },
  {
    question: 'How is the meeting spot “fair”?',
    answer:
      'We work out everyone’s travel time to MRT stations near the middle of the group, using each person’s own way of getting there (MRT, bus, car or walking, via OneMap), and pick the station where the travel times are most even.',
  },
  {
    question: 'Does it check the weather?',
    answer:
      'Yes. It shows the forecast and haze level for the time of your hangout, using NEA and Open-Meteo, so you can pick an indoor spot if it’s going to rain.',
  },
]

// Part (d) Your next hangout (shown when logged in)
const hangouts = ref([])
const loading = ref(false)
const errorMessage = ref('')

// The name they typed at sign up, or '' if we don't know it
const name = computed(() => {
  if (!auth.user) {
    return ''
  }
  return auth.user.user_metadata.display_name || ''
})

async function loadData() {
  if (!auth.isLoggedIn) {
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    hangouts.value = await getMyHangouts()
    // (Surya) from now on, changes to my hangouts update the Next up card by themselves
    stopListening()
    stopListening = subscribeToMyHangouts('landing', onHangoutChanged)
  } catch (error) {
    console.error(error)
    errorMessage.value = 'Couldn’t load your hangouts.'
  }
  loading.value = false
}

// (Surya) Live: when the host confirms a plan or starts a re-vote, or anyone votes, load the
// hangouts again (without the loading line, so the card doesn't flicker). A burst of changes
// reloads once.
let stopListening = () => {}
let reloadTimer = null

function onHangoutChanged() {
  clearTimeout(reloadTimer)
  reloadTimer = setTimeout(reloadQuietly, 400)
}

async function reloadQuietly() {
  try {
    hangouts.value = await getMyHangouts()
  } catch (error) {
    console.error(error)
  }
}

// After a refresh, Supabase takes a moment to say who is logged in, so load once it does
// (immediate: true also runs it straight away when the page opens)
watch(() => auth.isLoggedIn, loadData, { immediate: true })

// The soonest hangout that isn't finished yet (best-so-far loop)
const nextHangout = computed(() => {
  let next = null
  for (const h of hangouts.value) {
    if (h.status === 'done' || !h.starts_at) {
      continue
    }
    if (next === null || new Date(h.starts_at) < new Date(next.starts_at)) {
      next = h
    }
  }
  return next
})

// (Surya) What the Next up card says and where its button goes, from the same rules as the
// My hangouts cards (utils/hangoutStatus.js), so both always agree. e.g. "Your turn · 3 of 4
// voted" with "Cast your vote", or "✓ Plan confirmed · Mongkok Dimsum" with "View plan".
const nextStatus = computed(() => {
  let myId = null
  if (auth.user) {
    myId = auth.user.id
  }
  return getStatus(nextHangout.value, myId)
})

const nextLine = computed(() => {
  const h = nextHangout.value
  if (h.status === 'confirmed') {
    const spot = (h.shortlist ?? []).find((s) => s.id === h.final_shortlist_id)
    return spot ? `✓ Plan confirmed · ${spot.name}` : '✓ Plan confirmed'
  }
  const progress = getProgress(h)
  return progress ? `${nextStatus.value.text} · ${progress.text}` : nextStatus.value.text
})

// "Fri 24 Oct · 7 PM" (same format as the step bar)
function dateLabel(when) {
  const date = new Date(when)
  const day = date
    .toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })
    .replace(',', '')
  let hour = date.getHours() % 12
  if (hour === 0) {
    hour = 12
  }
  let minutes = ''
  if (date.getMinutes() !== 0) {
    minutes = ':' + String(date.getMinutes()).padStart(2, '0')
  }
  let amPm = 'PM'
  if (date.getHours() < 12) {
    amPm = 'AM'
  }
  return `${day} · ${hour}${minutes} ${amPm}`
}

// the button opens the step the hangout is up to (the page getStatus picked)
function continueRoute(hangout) {
  return { name: nextStatus.value.page, params: { id: hangout.id } }
}
</script>

<template>
  <main class="landing">
    <!-- Part (a) Hero: what Fairpoint is, and one button -->
    <section class="container hero">
      <div class="hero__copy">
        <span class="pill">
          <span class="pill__dot" aria-hidden="true"></span>
          Built for friend groups in Singapore
        </span>

        <h1 class="hero__title">Meet halfway.<br />Hang out better.</h1>

        <p class="hero__lead">
          Add where everyone’s coming from. Fairpoint finds a fair meeting spot, checks the weather
          and crowds, suggests cafes and activities nearby, and lets your group vote.
        </p>

        <div class="hero__actions">
          <RouterLink class="btn btn-primary btn-lg cta" :to="{ name: 'create-hangout' }">
            Start a hangout
          </RouterLink>
          <RouterLink v-if="auth.isLoggedIn" class="hero__link" :to="{ name: 'dashboard' }">
            Go to my hangouts →
          </RouterLink>
        </div>
      </div>

      <div
        ref="heroMap"
        class="hero__visual"
        :class="{ 'is-playing': mapPlaying }"
        aria-label="Preview: you and three friends meeting at a fair midpoint, each 18 to 22 minutes away"
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

          <!-- Routes to the midpoint, fading in one after another -->
          <line
            v-for="(f, i) in friends"
            :key="`route-${i}`"
            :x1="f.x"
            :y1="f.y"
            :x2="midpoint.x"
            :y2="midpoint.y"
            :stroke="f.color"
            class="map__route"
            :style="{ animationDelay: `${1 + i * 0.12}s` }"
          />

          <!-- Midpoint, with a ring that keeps pulsing out from it -->
          <circle
            :cx="midpoint.x"
            :cy="midpoint.y"
            r="38"
            class="map__halo"
            :style="midpointOrigin"
          />
          <circle
            :cx="midpoint.x"
            :cy="midpoint.y"
            r="38"
            class="map__pulse"
            :style="midpointOrigin"
          />
          <circle
            :cx="midpoint.x"
            :cy="midpoint.y"
            r="10"
            class="map__mid"
            :style="midpointOrigin"
          />

          <!-- You and your friends, dropping in one after another -->
          <g
            v-for="(f, i) in friends"
            :key="`pin-${i}`"
            class="map__pin"
            :style="{ animationDelay: `${i * 0.22}s` }"
          >
            <circle :cx="f.x" :cy="f.y" r="15" :fill="f.color" />
            <text :x="f.x" :y="f.y" dy="0.35em" text-anchor="middle">{{ f.label }}</text>
          </g>

          <!-- Everyone's trip time, close together -->
          <g
            v-for="(f, i) in friends"
            :key="`time-${i}`"
            class="map__chip"
            :style="{ animationDelay: `${2.1 + i * 0.1}s` }"
          >
            <rect :x="f.chipX" :y="f.y - 11" :width="CHIP_WIDTH" height="22" rx="11" />
            <text :x="f.chipX + CHIP_WIDTH / 2" :y="f.y" dy="0.35em" text-anchor="middle">
              {{ f.mins }} min
            </text>
          </g>
        </svg>

        <div class="midpoint-label">
          Fair for everyone<span class="midpoint-label__times"> · {{ timeRange }}</span>
        </div>
      </div>
    </section>

    <!-- Part (b) Logged in: your next hangout. Logged out: how it works in 3 steps -->
    <section class="band">
      <div class="container">
        <div v-if="auth.isLoggedIn" class="welcome">
          <h2 class="section-title">
            Welcome back<template v-if="name">, {{ name }}</template> 👋
          </h2>

          <p v-if="loading" class="text-secondary mb-0">Loading your hangouts…</p>

          <p v-else-if="errorMessage" class="text-secondary mb-0">
            {{ errorMessage }}
            <RouterLink :to="{ name: 'dashboard' }">Open My hangouts</RouterLink>
          </p>

          <div v-else-if="nextHangout" class="next-card">
            <div class="min-w-0">
              <div class="next-card__label">Next up</div>
              <div class="next-card__name text-truncate">{{ nextHangout.name }}</div>
              <div class="text-secondary">
                {{ dateLabel(nextHangout.starts_at) }} · {{ nextLine }}
              </div>
            </div>
            <RouterLink class="btn btn-primary btn-lg cta" :to="continueRoute(nextHangout)">
              {{ nextStatus.button }}
            </RouterLink>
          </div>

          <div v-else class="next-card">
            <div>
              <div class="next-card__name">No hangouts planned yet</div>
              <div class="text-secondary">Start one and invite your friends.</div>
            </div>
            <RouterLink class="btn btn-primary btn-lg cta" :to="{ name: 'create-hangout' }">
              Start a hangout
            </RouterLink>
          </div>
        </div>

        <div v-else>
          <h2 class="section-title text-center">How it works</h2>
          <ol class="steps">
            <li v-for="step in steps" :key="step.number" class="step">
              <span class="step__number" aria-hidden="true">{{ step.number }}</span>
              <h3 class="step__title">{{ step.title }}</h3>
              <p class="step__text">{{ step.text }}</p>
            </li>
          </ol>
        </div>
      </div>
    </section>

    <!-- Part (c) Features: rows that swap sides (text left, picture right, then the other way) -->
    <section class="container">
      <article
        v-for="(f, i) in features"
        :key="f.title"
        class="feature-row"
        :class="{ 'feature-row--flip': i % 2 === 1 }"
      >
        <div class="feature-row__text">
          <h2 class="section-title">{{ f.title }}</h2>
          <p class="feature-row__body">{{ f.text }}</p>
        </div>

        <div class="feature-row__picture" aria-hidden="true">
          <!-- Mini map: friends' routes meeting in the middle -->
          <svg v-if="f.picture === 'map'" class="mini-map" viewBox="0 0 300 200">
            <line
              v-for="p in miniPins"
              :key="`mini-route-${p.x}`"
              :x1="p.x"
              :y1="p.y"
              :x2="miniMidpoint.x"
              :y2="miniMidpoint.y"
              :stroke="p.color"
              class="map__route"
            />
            <circle :cx="miniMidpoint.x" :cy="miniMidpoint.y" r="22" class="map__halo" />
            <circle :cx="miniMidpoint.x" :cy="miniMidpoint.y" r="8" class="map__mid" />
            <g v-for="p in miniPins" :key="`mini-pin-${p.x}`" class="map__pin">
              <circle :cx="p.x" :cy="p.y" r="11" :fill="p.color" />
            </g>
          </svg>

          <!-- Weather card -->
          <div v-else-if="f.picture === 'weather'" class="card-preview weather">
            <svg width="34" height="28" viewBox="0 0 34 28">
              <circle cx="12" cy="11" r="8" fill="var(--landing-amber)" />
              <path
                d="M10 25a6 6 0 0 1 1-12 8 8 0 0 1 15 2 5 5 0 0 1 1 10z"
                fill="var(--landing-cloud)"
              />
            </svg>
            <div>
              <div class="weather__temp">29°C · Partly cloudy</div>
              <div class="weather__meta">Bishan · Fri 7 PM · Haze: good</div>
            </div>
          </div>

          <!-- Group vote card -->
          <div v-else class="card-preview vote">
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
      </article>
    </section>

    <!-- Part (d) FAQ: Bootstrap accordion, one answer open at a time -->
    <section class="container faq">
      <h2 class="section-title text-center">Questions? We’ve got answers.</h2>
      <div id="faq-list" class="accordion">
        <div v-for="(faq, i) in faqs" :key="faq.question" class="accordion-item">
          <h3 class="accordion-header">
            <button
              class="accordion-button collapsed"
              type="button"
              data-bs-toggle="collapse"
              :data-bs-target="`#faq-${i}`"
              aria-expanded="false"
              :aria-controls="`faq-${i}`"
            >
              {{ faq.question }}
            </button>
          </h3>
          <div :id="`faq-${i}`" class="accordion-collapse collapse" data-bs-parent="#faq-list">
            <div class="accordion-body">{{ faq.answer }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Part (e) Final button -->
    <section class="band band--cta">
      <div class="container text-center">
        <h2 class="section-title">Ready to stop arguing about where to meet?</h2>
        <RouterLink class="btn btn-primary btn-lg cta" :to="{ name: 'create-hangout' }">
          Start a hangout
        </RouterLink>
      </div>
    </section>
  </main>
</template>

<style scoped>
.landing {
  /* Illustration-only colours for the map preview */
  --landing-pink: var(--fp-pink);
  --landing-blue: var(--fp-blue);
  --landing-purple: var(--fp-purple);
  --landing-amber: var(--fp-amber);
  --landing-cloud: var(--fp-cloud);
}

/* Every section gets plenty of space, like Netflix's landing page */
.landing > section {
  padding-block: 4.5rem;
}

.section-title {
  margin-bottom: 1rem;
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

@media (min-width: 992px) {
  .section-title {
    font-size: 2.25rem;
  }
}

/* A soft coloured band across the whole width */
.band {
  background: color-mix(in srgb, var(--fp-primary) 7%, var(--fp-surface));
}

.cta {
  min-height: 48px;
  padding: 0.75rem 1.4rem;
  font-size: 1rem;
  font-weight: 600;
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
  font-size: 2.5rem;
  font-weight: 800;
  line-height: 1.02;
  letter-spacing: -0.035em;
}

@media (min-width: 768px) {
  .hero__title {
    font-size: 3.25rem;
  }
}

@media (min-width: 1200px) {
  .hero__title {
    font-size: 4rem;
  }
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
  align-items: center;
  gap: 1.25rem;
  margin-top: 2rem;
}

.hero__link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  font-weight: 600;
  text-decoration: none;
}

/* Map preview */
.hero__visual {
  position: relative;
  aspect-ratio: 600 / 460;
  border-radius: calc(var(--fp-radius) * 1.5);
  overflow: hidden;
  box-shadow: 0 20px 50px rgb(0 0 0 / 0.1);
  background: var(--fp-map-land);
}

.map {
  display: block;
  width: 100%;
  height: 100%;
}

.map__water {
  fill: var(--fp-map-water);
}

.map__park {
  fill: var(--fp-map-park);
  opacity: 0.8;
}

.map__road path {
  fill: none;
  stroke: var(--fp-surface);
  stroke-width: 5;
}

.map__road--major path {
  stroke: var(--fp-map-road);
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
  font-size: 11px;
  font-weight: 700;
}

.map__chip rect {
  fill: var(--fp-surface);
  stroke: var(--fp-border);
  filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.12));
}

.map__chip text {
  fill: var(--fp-ink);
  font-size: 12px;
  font-weight: 700;
}

@keyframes pin-drop {
  from {
    opacity: 0;
    transform: translateY(-24px);
  }
}

@keyframes pop-in {
  from {
    opacity: 0;
    transform: scale(0.3);
  }
}

@keyframes pulse-ring {
  from {
    opacity: 0.9;
    transform: scale(0.3);
  }
  to {
    opacity: 0;
    transform: scale(1.9);
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
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

/* phones: the map is too small to read the time tags, so the label gives the range instead */
.midpoint-label__times {
  display: none;
}

@media (max-width: 575.98px) {
  .map__chip {
    display: none;
  }

  .midpoint-label__times {
    display: inline;
  }
}

/* the ring around the midpoint: invisible unless it's animating */
.map__pulse {
  fill: none;
  stroke: var(--fp-primary);
  stroke-width: 3;
  opacity: 0;
}

/* The hero map's animation, in order, only when "reduce motion" is off (with it on, the finished
   map just shows). Until the map is on screen (no is-playing class yet) its parts are hidden. */
@media (prefers-reduced-motion: no-preference) {
  .hero__visual:not(.is-playing) .map__route,
  .hero__visual:not(.is-playing) .map__pin,
  .hero__visual:not(.is-playing) .map__halo,
  .hero__visual:not(.is-playing) .map__mid,
  .hero__visual:not(.is-playing) .map__chip,
  .hero__visual:not(.is-playing) .midpoint-label {
    opacity: 0;
  }

  .is-playing .map__pin {
    animation: pin-drop 0.45s ease-out both;
  }

  .is-playing .map__route {
    animation: fade-in 0.6s ease-out both;
  }

  .is-playing .map__halo,
  .is-playing .map__mid {
    animation: pop-in 0.45s ease-out 1.8s both;
  }

  .is-playing .map__chip {
    animation: fade-in 0.35s ease-out both;
  }

  .is-playing .midpoint-label {
    animation: fade-in 0.4s ease-out 2.6s both;
  }

  /* a ring grows out of the midpoint and fades, every 2.4s, forever */
  .is-playing .map__pulse {
    animation: pulse-ring 2.4s ease-out 2.2s infinite;
  }
}

/* How it works */
.steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin: 2rem 0 0;
  padding: 0;
  list-style: none;
}

.step {
  text-align: center;
}

.step__number {
  display: inline-grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--fp-primary);
  color: var(--fp-surface);
  font-size: 1.25rem;
  font-weight: 800;
}

.step__title {
  margin: 1rem 0 0.5rem;
  font-size: 1.1rem;
  font-weight: 700;
}

.step__text {
  margin: 0 auto;
  max-width: 18rem;
  color: var(--fp-muted);
}

/* Welcome card (logged in) */
.next-card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem 2rem;
  padding: 1.5rem;
  border-radius: var(--fp-radius);
  background: var(--fp-surface);
  box-shadow: var(--fp-shadow);
}

.next-card__label {
  color: var(--fp-primary);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.next-card__name {
  font-size: 1.35rem;
  font-weight: 700;
}

.min-w-0 {
  min-width: 0; /* lets text-truncate work inside a flex row */
}

/* Feature rows */
.feature-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  align-items: center;
}

.feature-row + .feature-row {
  margin-top: 4.5rem;
}

/* Every second row: picture on the left, text on the right */
.feature-row--flip .feature-row__text {
  order: 2;
}

.feature-row__body {
  max-width: 30rem;
  color: var(--fp-muted);
  font-size: 1.1rem;
  line-height: 1.6;
}

.feature-row__picture {
  display: grid;
  place-items: center;
  min-height: 240px;
  padding: 2rem;
  border-radius: calc(var(--fp-radius) * 1.5);
  background: color-mix(in srgb, var(--fp-primary) 7%, var(--fp-surface));
}

.mini-map {
  width: 100%;
  max-width: 320px;
}

.card-preview {
  background: var(--fp-surface);
  border-radius: var(--fp-radius-sm);
  box-shadow: var(--fp-shadow);
}

.weather {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
}

.weather__temp {
  font-weight: 700;
}

.weather__meta {
  color: var(--fp-muted);
  font-size: 0.85rem;
}

.vote {
  width: 100%;
  max-width: 280px;
  padding: 1.25rem;
}

.vote__title {
  margin-bottom: 0.6rem;
  font-weight: 700;
}

.vote__row + .vote__row {
  margin-top: 0.7rem;
}

.vote__line {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.vote__count {
  font-weight: 600;
  white-space: nowrap;
}

.vote__bar {
  height: 6px;
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

/* FAQ */
.faq .accordion {
  max-width: 760px;
  margin: 2rem auto 0;
}

.faq .accordion-button {
  min-height: 56px;
  font-weight: 600;
}

.faq .accordion-button:not(.collapsed) {
  background: color-mix(in srgb, var(--fp-primary) 8%, var(--fp-surface));
  color: var(--fp-ink);
}

.faq .accordion-button:focus {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--fp-primary) 25%, transparent);
}

.faq .accordion-body {
  color: var(--fp-muted);
  line-height: 1.6;
}

/* Responsive */
@media (max-width: 991.98px) {
  .hero,
  .feature-row {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  /* On one column the text always comes first */
  .feature-row--flip .feature-row__text {
    order: 0;
  }
}

@media (max-width: 767.98px) {
  .landing > section {
    padding-block: 3rem;
  }

  .steps {
    grid-template-columns: 1fr;
  }

  .next-card .cta {
    width: 100%;
  }
}
</style>
