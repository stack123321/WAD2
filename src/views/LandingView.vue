<script setup>
// 01 Landing
// Owner: Matrix · Vet by: Hugo
// Figma frame "01" (Direction C): a giant teal "Meet in the middle." with one grey and one black
// pill, three numbered steps, a panel showing everyone's trip on one scale, the weather and vote
// panels, and a closing call to create an account. Logged-in visitors get "Start a hangout".
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

// Logged out: create an account first. Logged in: go straight to a new hangout.
const mainAction = computed(() =>
  auth.isLoggedIn
    ? { label: 'Start a hangout', to: { name: 'create-hangout' } }
    : { label: 'Create account', to: { name: 'auth', query: { mode: 'signup' } } },
)

const steps = [
  {
    n: '1',
    title: 'Drop your pins.',
    text: 'Everyone adds where they’re coming from, and how they’re getting there.',
  },
  {
    n: '2',
    title: 'We find the fair spot.',
    text: 'Balanced by travel time, then checked against the weather and the crowds.',
  },
  {
    n: '3',
    title: 'Vote, then go.',
    text: 'Shortlist cafés and activities nearby. The group picks in one tap each.',
  },
]

// Example trips on one scale (sample data): the bar is the trip as a share of 40 minutes
const trips = [
  { initial: 'R', from: 'Tampines', mins: 34, tone: 'teal' },
  { initial: 'N', from: 'Jurong East', mins: 36, tone: 'rust' },
  { initial: 'S', from: 'Woodlands', mins: 27, tone: 'violet' },
  { initial: 'H', from: 'Punggol', mins: 27, tone: 'ochre' },
  { initial: 'E', from: 'Paya Lebar', mins: 22, tone: 'blue' },
].map((t) => ({ ...t, width: `${Math.round((t.mins / 40) * 100)}%` }))

const votes = [
  { name: 'Brew & Board Café', votes: 3, width: '60%', lead: true },
  { name: 'Bishan Park cycling', votes: 2, width: '40%', lead: false },
]
</script>

<template>
  <main class="landing">
    <section class="hero">
      <h1 class="hero-title">Meet in the middle.</h1>
      <p class="hero-lead">
        Add where everyone’s coming from. Fairpoint finds the fair spot, checks the weather and
        crowds, and lets your group vote.
      </p>
      <div class="hero-actions">
        <a class="btn btn-secondary btn-lg" href="#how-it-works">See how it works</a>
        <RouterLink class="btn btn-primary btn-lg" :to="mainAction.to">
          {{ mainAction.label }}
        </RouterLink>
      </div>
    </section>

    <section id="how-it-works" class="how">
      <h2 class="how-title">Three steps. One plan.</h2>
      <ol class="steps">
        <li v-for="s in steps" :key="s.n" class="step">
          <span class="step-n" aria-hidden="true">{{ s.n }}</span>
          <h3 class="step-title">{{ s.title }}</h3>
          <p class="step-text">{{ s.text }}</p>
        </li>
      </ol>
    </section>

    <section class="proof">
      <div class="panel panel--wide">
        <div class="panel-copy">
          <h3 class="panel-title">Fair means travel time, not distance.</h3>
          <p class="panel-text">
            MRT, bus, car or on foot. Fairpoint keeps everyone’s trip within a few minutes of each
            other.
          </p>
        </div>
        <ul class="trips" aria-label="Example: five friends' trips to one spot">
          <li v-for="t in trips" :key="t.initial" class="trip">
            <span class="avatar" :class="`avatar--${t.tone}`" aria-hidden="true">{{
              t.initial
            }}</span>
            <span class="trip-from">{{ t.from }}</span>
            <span class="trip-bar" aria-hidden="true">
              <span class="fp-grow" :style="{ width: t.width }"></span>
            </span>
            <span class="trip-mins fp-num">{{ t.mins }} min</span>
          </li>
        </ul>
      </div>

      <div class="proof-pair">
        <div class="panel panel--stack">
          <h3 class="panel-title">Rain at eight? We’ll know.</h3>
          <div class="chips">
            <span class="chip">29°C · Partly cloudy</span>
            <span class="chip">Bishan MRT · Quiet</span>
            <span class="chip">Indoor picks first</span>
          </div>
        </div>
        <div class="panel panel--dark panel--stack">
          <h3 class="panel-title">One vote. No 200-message thread.</h3>
          <ul class="vote-list" aria-label="Example vote">
            <li v-for="v in votes" :key="v.name">
              <div class="vote-line">
                <span>{{ v.name }}</span
                ><span>{{ v.votes }} votes</span>
              </div>
              <div class="vote-track" aria-hidden="true">
                <span class="fp-grow" :class="{ lead: v.lead }" :style="{ width: v.width }"></span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <section class="close">
      <h2 class="close-title">Your Friday, sorted.</h2>
      <RouterLink class="btn btn-primary btn-lg" :to="mainAction.to">
        {{ mainAction.label }}
      </RouterLink>
      <p v-if="!auth.isLoggedIn" class="close-note">
        Already have one? <RouterLink :to="{ name: 'auth' }">Log in</RouterLink>
      </p>
    </section>

    <footer class="foot">
      <span class="foot-mark">fairpoint</span>
      <span>Built for friend groups in Singapore · IS216</span>
    </footer>
  </main>
</template>

<style scoped>
.landing {
  /* Example member colours for the sample trips (white initials on each) */
  --tone-teal: var(--fp-primary);
  --tone-rust: var(--fp-avatar-rust);
  --tone-violet: var(--fp-avatar-violet);
  --tone-ochre: var(--fp-avatar-ochre);
  --tone-blue: var(--fp-avatar-blue);
}

/* ---------- Hero: one headline, two pills ---------- */

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: min(720px, calc(100svh - 88px));
  padding: 5rem 1.5rem;
  text-align: center;
}

.hero-title {
  margin: 0;
  font-size: clamp(4rem, 10.5vw, 10.5rem);
  line-height: 0.95;
  letter-spacing: -0.025em;
}

.hero-lead {
  max-width: 40rem;
  margin: 1.75rem 0 0;
  color: var(--fp-muted);
  font-size: 1.3rem;
  line-height: 1.5;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.6rem;
  margin-top: 2.5rem;
}

.hero-actions .btn,
.close .btn {
  --bs-btn-font-size: 1.3rem;
}

/* ---------- Three steps ---------- */

.how {
  padding: 7rem clamp(1rem, 5vw, 5rem);
  border-top: 1px solid var(--fp-border);
}

.how-title {
  margin: 0;
  font-weight: 800;
  font-size: clamp(2.5rem, 5vw, 4rem);
  letter-spacing: -0.02em;
  text-align: center;
}

.steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 3rem;
  max-width: 1240px;
  margin: 4.5rem auto 0;
  padding: 0;
  list-style: none;
}

.step-n {
  display: block;
  font-family: var(--fp-display);
  font-weight: 900;
  font-size: 6rem;
  line-height: 1;
  color: var(--fp-primary);
}

.step-title {
  margin: 1rem 0 0;
  font-size: 2rem;
  line-height: 1.15;
}

.step-text {
  margin: 0.5rem 0 0;
  color: var(--fp-muted);
  font-size: 1.125rem;
  line-height: 1.45;
}

/* ---------- Proof panels ---------- */

.proof {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 1240px;
  margin: 0 auto;
  padding: 0 clamp(1rem, 5vw, 5rem) 7.5rem;
  box-sizing: content-box;
}

.panel {
  padding: clamp(2rem, 4vw, 3.25rem);
  background: var(--fp-surface);
  border-radius: var(--fp-radius-lg);
}

.panel--wide {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2.5rem 4rem;
  padding: clamp(2rem, 5vw, 4rem);
}

.panel-copy,
.trips {
  flex: 1 1 380px;
  min-width: 0;
}

.panel-title {
  margin: 0;
  font-weight: 800;
  font-size: clamp(2.25rem, 4vw, 3.25rem);
  line-height: 1.05;
  letter-spacing: -0.02em;
}

.panel--stack .panel-title {
  font-size: 2.5rem;
}

.panel-text {
  margin: 1rem 0 0;
  color: var(--fp-muted);
  font-size: 1.125rem;
  line-height: 1.5;
}

.trips {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.trip {
  display: grid;
  grid-template-columns: 36px 7.5rem minmax(0, 1fr) 3.5rem;
  align-items: center;
  gap: 0.9rem;
  font-size: 0.95rem;
}

.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: var(--fp-bg);
  font-weight: 700;
}

.avatar--teal {
  background: var(--tone-teal);
}

.avatar--rust {
  background: var(--tone-rust);
}

.avatar--violet {
  background: var(--tone-violet);
}

.avatar--ochre {
  background: var(--tone-ochre);
}

.avatar--blue {
  background: var(--tone-blue);
}

.trip-from {
  font-weight: 600;
}

.trip-bar {
  height: 10px;
  border-radius: var(--fp-radius-pill);
  background: var(--fp-pill);
  overflow: hidden;
}

.trip-bar span {
  display: block;
  height: 100%;
  border-radius: var(--fp-radius-pill);
  background: var(--fp-ink);
}

.trip-mins {
  color: var(--fp-muted);
  text-align: right;
}

.proof-pair {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr));
  gap: 1.5rem;
}

.panel--stack {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 2.25rem;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.chip {
  padding: 0.6rem 1rem;
  border-radius: var(--fp-radius-pill);
  background: var(--fp-bg);
  font-size: 0.95rem;
  font-weight: 600;
}

/* The one black feature card on the page */
.panel--dark {
  background: var(--fp-ink);
  color: var(--fp-bg);
}

.panel--dark .panel-title {
  color: var(--fp-bg);
}

.vote-list {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.95rem;
}

.vote-line {
  display: flex;
  justify-content: space-between;
}

.vote-track {
  height: 8px;
  margin-top: 0.5rem;
  border-radius: var(--fp-radius-pill);
  background: var(--fp-ink-hover);
  overflow: hidden;
}

.vote-track span {
  display: block;
  height: 100%;
  border-radius: var(--fp-radius-pill);
  background: var(--fp-disabled);
}

.vote-track span.lead {
  background: var(--fp-mint);
}

/* ---------- Close and footer ---------- */

.close {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2.5rem;
  padding: 8rem 1.5rem;
  border-top: 1px solid var(--fp-border);
  text-align: center;
}

.close-title {
  margin: 0;
  color: var(--fp-primary);
  font-weight: 800;
  font-size: clamp(3.25rem, 7vw, 6.5rem);
  line-height: 0.98;
  letter-spacing: -0.025em;
}

.close-note {
  margin: -1.25rem 0 0;
  color: var(--fp-muted);
}

.close-note a {
  font-weight: 700;
  text-decoration: none;
}

.foot {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 1.75rem clamp(1rem, 2.8vw, 2.5rem);
  border-top: 1px solid var(--fp-border);
  color: var(--fp-muted);
  font-size: 0.875rem;
}

.foot-mark {
  font-family: var(--fp-display);
  font-weight: 900;
  font-size: 1.25rem;
  color: var(--fp-primary);
}

/* ---------- Tablet and phone ---------- */

@media (max-width: 991.98px) {
  .steps {
    gap: 1.5rem;
  }

  .step-n {
    font-size: 4rem;
  }

  .step-title {
    font-size: 1.375rem;
  }

  .step-text {
    font-size: 0.95rem;
  }
}

@media (max-width: 575.98px) {
  .hero {
    min-height: 0;
    padding: 4.5rem 1rem 4rem;
  }

  .hero-lead {
    font-size: 1.125rem;
  }

  .hero-actions .btn,
  .close .btn {
    --bs-btn-font-size: 1.1rem;
  }

  .how {
    padding-block: 4.5rem;
  }

  .steps {
    grid-template-columns: minmax(0, 1fr);
    gap: 2rem;
    margin-top: 2.5rem;
  }

  .trip {
    grid-template-columns: 32px 5.5rem minmax(0, 1fr) 3.25rem;
    gap: 0.6rem;
    font-size: 0.875rem;
  }

  .avatar {
    width: 32px;
    height: 32px;
  }

  .panel--stack .panel-title {
    font-size: 2rem;
  }

  .close {
    padding-block: 5rem;
  }
}
</style>
