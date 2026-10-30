<script setup>
// 01 Landing
// Owner: Matrix · Vet by: Hugo
// Figma frame "01". Explains what Fairpoint is, Netflix-style: a hero with one button, then
// full-width sections down the page (how it works, features, FAQ, a final button).
// Logged-in users see their next hangout instead of the "how it works" steps.
// (Surya, improve/user-friendly-customised: one button, personal welcome card, feature rows, FAQ.)
// (Eashvar, design catalogue A1) hero: the island of Singapore in dots on a teal field that fades
// into the page, and three real cards from the app (fair trips, the plan, the vote) fanned over
// the edge, in place of the drawn map, whose midpoint wasn't true for whoever was looking.
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getMyHangouts } from '@/services/hangouts'
import DotIsland from '@/components/ui/DotIsland.vue'

const auth = useAuthStore()

// The fanned cards in the hero: a sample group's trips (bar width = share of the longest trip)
const sampleTrips = [
  { initial: 'R', name: 'Ryan', mins: 34, color: 'var(--fp-primary)' },
  { initial: 'N', name: 'Nicole', mins: 36, color: 'var(--landing-pink)', longest: true },
  { initial: 'S', name: 'Surya', mins: 27, color: 'var(--landing-purple)' },
  { initial: 'H', name: 'Hugo', mins: 27, color: 'var(--landing-amber)' },
]

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
  } catch (error) {
    console.error(error)
    errorMessage.value = 'Couldn’t load your hangouts.'
  }
  loading.value = false
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

// "3 of 4 starting points added"
const startsAdded = computed(() => {
  let count = 0
  for (const m of nextHangout.value.members) {
    if (m.start_lat != null) {
      count++
    }
  }
  return count
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

// Continue planning: open the step the hangout is up to
function continueRoute(hangout) {
  let page = 'starting-points'
  if (hangout.status === 'voting') {
    page = 'vote'
  } else if (hangout.status === 'confirmed') {
    page = 'final-plan'
  }
  return { name: page, params: { id: hangout.id } }
}
</script>

<template>
  <main class="landing">
    <!-- Part (a) Hero: what Fairpoint is, and one button -->
    <section class="hero">
      <div class="hero__bg" aria-hidden="true">
        <DotIsland class="hero__island" />
        <div class="hero__glow"></div>
      </div>

      <div class="container hero__copy">
        <h1 class="hero__title">Meet halfway.<br />Hang out better.</h1>

        <p class="hero__lead">
          Add where everyone’s starting. Fairpoint finds the MRT stop where nobody’s trip is much
          longer than anyone else’s, checks the weather and crowds there, and lets your group vote
          on a place nearby.
        </p>

        <div class="hero__actions">
          <RouterLink class="btn btn-accent btn-lg cta" :to="{ name: 'create-hangout' }">
            Start a hangout
          </RouterLink>
          <RouterLink
            v-if="auth.isLoggedIn"
            class="btn btn-on-deep btn-lg cta"
            :to="{ name: 'dashboard' }"
          >
            Go to my hangouts →
          </RouterLink>
        </div>
      </div>

      <!-- three real cards from the app, fanned over the hero's lower edge -->
      <div
        class="container fan"
        role="img"
        aria-label="Example: a fair trip for everyone, the confirmed plan, and the group vote"
      >
        <div class="fan__card fan__card--left" aria-hidden="true">
          <p class="fan__title">Fair for everyone</p>
          <div v-for="t in sampleTrips" :key="t.name" class="fan__trip">
            <span class="fan__dot" :style="{ background: t.color }">{{ t.initial }}</span>
            <div>
              <b>{{ t.name }}</b>
              <div class="fan__track">
                <span
                  :class="{ long: t.longest }"
                  :style="{ width: `${Math.round((t.mins / 36) * 100)}%` }"
                ></span>
              </div>
            </div>
            <b>{{ t.mins }} min</b>
          </div>
          <p class="fan__note"><span class="fan__chip">9 min gap</span> longest to shortest</p>
        </div>

        <div class="fan__card fan__card--middle" aria-hidden="true">
          <p class="fan__label">Confirmed spot</p>
          <p class="fan__name">Brew &amp; Board Café</p>
          <p class="fan__note">Board game cafe · rated 4.6 · Bishan</p>
          <div class="fan__ticket">
            <div><small>When</small><b>Fri 16 Oct, 7 pm</b></div>
            <div><small>You leave by</small><b class="fan__you">6:26 pm</b></div>
          </div>
        </div>

        <div class="fan__card fan__card--right" aria-hidden="true">
          <p class="fan__title">Group voting</p>
          <div class="fan__vote fan__vote--lead">
            <div class="fan__vote-top"><span>Brew &amp; Board Café</span><span>3</span></div>
            <div class="fan__track"><span style="width: 75%"></span></div>
          </div>
          <div class="fan__vote">
            <div class="fan__vote-top"><span>Bishan Park cycling</span><span>1</span></div>
            <div class="fan__track"><span class="grey" style="width: 25%"></span></div>
          </div>
          <p class="fan__note">Closes in 2 h · Hugo hasn’t voted</p>
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
                {{ dateLabel(nextHangout.starts_at) }} · {{ startsAdded }} of
                {{ nextHangout.members.length }} starting points added
              </div>
            </div>
            <RouterLink class="btn btn-primary btn-lg cta" :to="continueRoute(nextHangout)">
              Continue planning
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
          <h2 class="section-title">How it works</h2>
          <ol class="steps">
            <li v-for="step in steps" :key="step.number" class="step">
              <span class="step__dot" aria-hidden="true"></span>
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
          <!-- (Eashvar, design catalogue A1) each feature shown with the real card from the app -->
          <div v-if="f.picture === 'map'" class="stage stage--teal">
            <div class="app-card">
              <div class="app-card__head">
                <span>Travel time to Bishan MRT</span><span class="app-chip">9 min gap</span>
              </div>
              <div v-for="t in sampleTrips" :key="t.name" class="fan__trip">
                <span class="fan__dot" :style="{ background: t.color }">{{ t.initial }}</span>
                <div>
                  <b>{{ t.name }}</b>
                  <div class="fan__track">
                    <span
                      :class="{ long: t.longest }"
                      :style="{ width: `${Math.round((t.mins / 36) * 100)}%` }"
                    ></span>
                  </div>
                </div>
                <b>{{ t.mins }} min</b>
              </div>
            </div>
          </div>

          <div v-else-if="f.picture === 'weather'" class="stage stage--coral">
            <div class="app-card">
              <div class="app-card__head">
                <span>Weather at Bishan</span><span class="app-tag">Fri 7 PM</span>
              </div>
              <div class="weather-now">
                <span class="weather-now__temp">29°C</span>
                <div>
                  <b>Partly cloudy</b>
                  <p class="app-card__muted">Rain 20% · Haze: good · UV low</p>
                </div>
              </div>
              <div class="hours">
                <div>5 PM<b>31°</b></div>
                <div>6 PM<b>30°</b></div>
                <div class="hours__now">7 PM<b>29°</b></div>
                <div>8 PM<b>28°</b></div>
                <div>9 PM<b>28°</b></div>
              </div>
            </div>
          </div>

          <div v-else class="stage stage--deep">
            <div class="app-card">
              <div class="app-card__head">
                <span>Group voting</span><span class="app-chip app-chip--coral">Closes in 2 h</span>
              </div>
              <div
                v-for="(v, n) in votes"
                :key="v.name"
                class="fan__vote"
                :class="{ 'fan__vote--lead': n === 0 }"
              >
                <div class="fan__vote-top">
                  <span>{{ v.name }}</span
                  ><span>{{ v.votes }} votes</span>
                </div>
                <div class="fan__track">
                  <span :class="{ grey: n > 0 }" :style="{ width: `${v.share}%` }"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>
    </section>

    <!-- Part (d) FAQ: Bootstrap accordion, one answer open at a time -->
    <section class="container faq">
      <h2 class="section-title">Questions? We’ve got answers.</h2>
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
      <DotIsland class="cta__island" />
      <div class="container text-center">
        <h2 class="section-title">Ready to stop arguing about where to meet?</h2>
        <RouterLink class="btn btn-accent btn-lg cta" :to="{ name: 'create-hangout' }">
          Start a hangout
        </RouterLink>
      </div>
    </section>

    <footer class="landing-foot">
      <div class="container">
        <p class="landing-foot__name" aria-hidden="true">Fairpoint</p>
        <div class="landing-foot__line">
          <span>Made for friend groups in Singapore</span>
          <span>Travel times: OneMap, LTA DataMall · Weather: NEA, Open-Meteo</span>
        </div>
      </div>
    </footer>
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
}

/* Every section gets plenty of space, like Netflix's landing page */
.landing > section {
  padding-block: 4.5rem;
}

.section-title {
  margin-bottom: 1rem;
  font-size: clamp(1.6rem, 3.5vw, 2.25rem);
  font-weight: 800;
  letter-spacing: -0.02em;
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

/* Hero (A1): the island in dots on a teal field that fades into the page */
.hero {
  position: relative;
  isolation: isolate;
  color: #fff;
  text-align: center;
  padding-top: clamp(3rem, 6vw, 5.5rem);
  background: linear-gradient(
    180deg,
    var(--fp-deep) 0%,
    var(--fp-deep-2) 38%,
    var(--fp-fade-1) 68%,
    var(--fp-fade-2) 86%,
    var(--fp-bg) 100%
  );
}

.hero__bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: -1;
}

.hero__island {
  position: absolute;
  left: 50%;
  top: 14%;
  width: min(1600px, 150vw);
  translate: -50% 0;
  /* fewer dots behind the words, so they stay clean */
  mask-image: radial-gradient(38% 30% at 50% 42%, rgb(0 0 0 / 0.25), #000 100%);
}

.hero__glow {
  position: absolute;
  left: 50%;
  bottom: 6%;
  width: min(900px, 120vw);
  height: 420px;
  translate: -50% 0;
  background: radial-gradient(closest-side, rgb(242 104 74 / 0.35), transparent);
}

.hero__title {
  margin: 0;
  font-size: clamp(2.6rem, 7.4vw, 6.6rem);
  font-weight: 800;
  line-height: 0.98;
  letter-spacing: -0.04em;
}

.hero__lead {
  margin: 1.6rem auto 0;
  max-width: 36rem;
  font-size: clamp(1.05rem, 1.4vw, 1.25rem);
  line-height: 1.55;
  color: var(--fp-on-deep);
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem 1rem;
  margin-top: 1.9rem;
}

.hero__title,
.hero__lead,
.hero__actions,
.fan__card {
  animation: rise 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.hero__lead {
  animation-delay: 80ms;
}

.hero__actions {
  animation-delay: 160ms;
}

@keyframes rise {
  from {
    opacity: 0;
    translate: 0 24px;
  }
}

/* the fan of cards, hanging over the edge into the next section */
.fan {
  display: grid;
  grid-template-columns: 1fr 1.15fr 1fr;
  align-items: start;
  max-width: 1120px;
  margin-top: clamp(2.5rem, 4.5vw, 4rem);
  margin-bottom: calc(-1 * clamp(90px, 11vw, 150px));
  text-align: left;
  color: var(--fp-ink);
}

.fan__card {
  padding: 1.25rem;
  border-radius: var(--fp-radius);
  background: var(--fp-surface);
  box-shadow: 0 24px 48px rgb(0 0 0 / 0.2);
  animation-delay: 300ms;
  transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.fan__card--left {
  transform: rotate(-5deg) translate(28px, 40px);
}

.fan__card--middle {
  position: relative;
  z-index: 1;
  animation-delay: 380ms;
}

.fan__card--right {
  transform: rotate(5deg) translate(-28px, 40px);
  animation-delay: 460ms;
}

.fan__card--left:hover {
  transform: rotate(-3deg) translate(28px, 26px);
}

.fan__card--right:hover {
  transform: rotate(3deg) translate(-28px, 26px);
}

.fan p {
  margin: 0;
}

.fan__title {
  font-weight: 700;
  margin-bottom: 0.5rem !important;
}

.fan__trip {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.6rem;
  padding: 0.45rem 0;
}

.fan__trip + .fan__trip {
  border-top: 1px solid var(--fp-border);
}

.fan__dot {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 800;
}

.fan__track {
  height: 6px;
  margin-top: 4px;
  border-radius: 99px;
  background: var(--fp-bg-2);
  overflow: hidden;
}

.fan__track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--fp-primary);
}

.fan__track .long {
  background: var(--fp-accent);
}

.fan__track .grey {
  background: var(--fp-muted);
}

.fan__note {
  margin-top: 0.5rem !important;
  color: var(--fp-muted);
  font-size: 0.875rem;
}

.fan__chip {
  padding: 2px 8px;
  border-radius: 99px;
  background: var(--fp-primary);
  color: #fff;
  font-weight: 700;
  font-size: 0.8125rem;
}

.fan__label {
  color: var(--fp-primary);
  font-size: 0.875rem;
  font-weight: 700;
}

.fan__name {
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.fan__ticket {
  display: grid;
  grid-template-columns: 1fr 1fr;
  margin-top: 0.75rem;
  border-radius: var(--fp-radius-sm);
  background: var(--fp-bg);
}

.fan__ticket > div {
  padding: 0.6rem 0.75rem;
}

.fan__ticket > div + div {
  border-left: 1px dashed var(--fp-border);
}

.fan__ticket small {
  display: block;
  color: var(--fp-muted);
  font-size: 0.8125rem;
}

.fan__you {
  color: var(--fp-primary);
}

.fan__vote {
  padding: 0.6rem 0.75rem;
  border-radius: var(--fp-radius-sm);
  background: var(--fp-bg);
}

.fan__vote + .fan__vote {
  margin-top: 0.5rem;
}

.fan__vote--lead {
  background: var(--fp-primary-soft);
}

.fan__vote-top {
  display: flex;
  justify-content: space-between;
  font-weight: 700;
}

/* the section after the hero clears the cards hanging over */
.hero + .band {
  padding-top: clamp(170px, 17vw, 250px) !important;
}

@media (prefers-reduced-motion: reduce) {
  .hero__title,
  .hero__lead,
  .hero__actions,
  .fan__card {
    animation: none;
  }
}

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

/* FAQ */
.faq .accordion {
  margin: 0;
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

/* (Eashvar, design catalogue A1) the sections below the hero */
.band {
  background: transparent;
}

.section-title {
  font-size: clamp(2rem, 4vw, 3.2rem);
  font-weight: 800;
  line-height: 1.04;
  letter-spacing: -0.035em;
}

/* how it works: three moments along one dotted path */
.steps {
  position: relative;
  text-align: left;
}

.steps::before {
  content: '';
  position: absolute;
  left: 6%;
  right: 6%;
  top: 22px;
  border-top: 3px dotted var(--fp-on-deep-done);
}

.step {
  position: relative;
  text-align: left;
}

.step__dot {
  display: block;
  width: 44px;
  height: 44px;
  margin-bottom: 1.25rem;
  border-radius: 50%;
  background: var(--fp-primary);
  outline: 8px solid var(--fp-bg);
}

.step:nth-child(2) .step__dot {
  background: var(--fp-accent);
}

.step:nth-child(3) .step__dot {
  background: var(--fp-deep);
}

.step__title {
  font-size: 1.3rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.step__text {
  margin: 0;
  max-width: 22rem;
  font-size: 1.05rem;
}

/* feature pictures: the app's own cards on a field of colour */
.feature-row__picture {
  background: none;
  padding: 0;
}

.stage {
  width: 100%;
  border-radius: 28px;
  padding: clamp(1.25rem, 3vw, 2.5rem);
}

.stage--teal {
  background: var(--fp-primary);
}

.stage--coral {
  background: var(--fp-accent);
}

.stage--deep {
  background: var(--fp-deep);
}

.app-card {
  padding: 1.25rem;
  border-radius: var(--fp-radius);
  background: var(--fp-surface);
  color: var(--fp-ink);
  text-align: left;
}

.app-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-weight: 700;
}

.app-card__muted {
  margin: 0;
  color: var(--fp-muted);
  font-size: 0.875rem;
}

.app-chip {
  padding: 3px 10px;
  border-radius: 99px;
  background: var(--fp-primary);
  color: #fff;
  font-size: 0.8125rem;
  font-weight: 700;
  white-space: nowrap;
}

.app-chip--coral {
  background: var(--fp-accent);
  color: var(--fp-deep);
}

.app-tag {
  padding: 3px 10px;
  border-radius: 99px;
  background: var(--fp-bg);
  font-size: 0.8125rem;
  font-weight: 600;
}

.weather-now {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.weather-now__temp {
  font-size: 2.6rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.hours {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  margin-top: 0.9rem;
  text-align: center;
  font-size: 0.875rem;
}

.hours div {
  padding: 0.5rem 0;
  border-radius: 10px;
  background: var(--fp-bg);
}

.hours b {
  display: block;
}

.hours .hours__now {
  background: var(--fp-primary);
  color: #fff;
}

/* FAQ: the heading on the left, the questions on the right */
.faq {
  display: grid;
  grid-template-columns: 0.8fr 1.2fr;
  gap: clamp(1.75rem, 5vw, 5rem);
  align-items: start;
}

/* the closing band, deep teal with the island */
.band.band--cta {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  padding-block: clamp(4rem, 8vw, 7.5rem);
  background: linear-gradient(
    180deg,
    var(--fp-deep) 0%,
    var(--fp-deep-2) 60%,
    var(--fp-primary) 100%
  );
  color: #fff;
}

.cta__island {
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(1200px, 140vw);
  translate: -50% -50%;
  z-index: -1;
}

.band--cta .section-title {
  max-width: 18ch;
  margin: 0 auto 1.75rem;
}

.landing-foot {
  padding: 3.5rem 0 2rem;
  background: var(--fp-deep);
  color: var(--fp-on-deep-muted);
}

.landing-foot__name {
  margin: 0;
  color: #fff;
  font-size: clamp(3rem, 12vw, 10rem);
  font-weight: 800;
  line-height: 0.9;
  letter-spacing: -0.05em;
}

.landing-foot__line {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.75rem 1.5rem;
  margin-top: 1.75rem;
  font-size: 0.875rem;
}

/* Responsive */
@media (max-width: 860px) {
  .fan {
    grid-template-columns: 1fr;
    max-width: 420px;
    margin-bottom: -90px;
  }

  .fan__card--left,
  .fan__card--right {
    display: none;
  }
}

@media (max-width: 991.98px) {
  .feature-row {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  /* On one column the text always comes first */
  .feature-row--flip .feature-row__text {
    order: 0;
  }
}

@media (max-width: 991.98px) {
  .faq {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 767.98px) {
  .landing > section {
    padding-block: 3rem;
  }

  .steps {
    grid-template-columns: 1fr;
  }

  /* the dotted path runs down the left on phones */
  .steps::before {
    left: 21px;
    right: auto;
    top: 0;
    bottom: 0;
    border-top: 0;
    border-left: 3px dotted var(--fp-on-deep-done);
  }

  .step {
    padding-left: 68px;
  }

  .step__dot {
    position: absolute;
    left: 0;
    top: 0;
  }

  .next-card .cta {
    width: 100%;
  }
}
</style>
