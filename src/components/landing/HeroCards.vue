<script setup>
// Owner: Eashvar. The three cards fanned over the edge of the landing page's hero.
//   live:    your next (or last) hangout, from utils/heroCards.js: everyone's trips, the spot and
//            the vote. The whole fan is one link to the step that hangout is on.
//   general: logged out, or no hangouts yet. Nothing made up: MRT crowds right now (LTA, via
//            /api/crowd), the weather in Singapore now (Open-Meteo, NEA haze), and your group.
//            If LTA only has sample levels, or a source fails, that card explains instead.
//   loading: grey placeholders the same size, so the hero doesn't jump.
// Usage: <HeroCards mode="live" :cards="buildHeroCards(...)" /> or <HeroCards mode="general" />
import { computed, ref, watch } from 'vue'
import { getCrowdLevels } from '@/services/crowd'
import { getHaze, getHourlyForecast, sgHourKey } from '@/services/weather'

const props = defineProps({
  mode: { type: String, required: true }, // live | general | loading
  cards: { type: Object, default: null }, // from buildHeroCards(), for live
  you: { type: String, default: 'Y' }, // your initial, for the general "your group" card
})

// the middle of Singapore, for the weather
const SG = { lat: 1.3521, lng: 103.8198 }
const LEVEL = { h: 'Busy', m: 'Moderate', l: 'Quiet' }
const RANK = { h: 3, m: 2, l: 1 }

const stations = ref(null) // null until loaded, [] if it failed
const hours = ref(null)
const haze = ref(null)

// each source fills its card as soon as it answers, so a slow one doesn't hold up the others
function loadGeneral() {
  const now = new Date()
  getCrowdLevels(now)
    .then((list) => (stations.value = list))
    .catch(() => (stations.value = []))
  getHourlyForecast(SG.lat, SG.lng)
    .then((forecast) => {
      // this hour and the four after it
      const i = forecast.findIndex((h) => h.time === sgHourKey(now))
      hours.value = i === -1 ? [] : forecast.slice(i, i + 5)
    })
    .catch(() => (hours.value = []))
  getHaze()
    .then((psi) => (haze.value = psi))
    .catch(() => (haze.value = null))
}

watch(
  () => props.mode,
  (mode) => {
    if (mode === 'general' && stations.value === null) loadGeneral()
  },
  { immediate: true },
)

// LTA unavailable: the server sends sample levels, named "… (sample)", which we never show as real
const crowdReal = computed(
  () => stations.value?.length > 0 && !stations.value[0].station.includes('(sample)'),
)
const busiest = computed(() =>
  (stations.value ?? [])
    .filter((s) => s.level !== 'l')
    .sort((a, b) => RANK[b.level] - RANK[a.level] || a.station.localeCompare(b.station))
    .slice(0, 3),
)
const quietCount = computed(() => (stations.value ?? []).filter((s) => s.level === 'l').length)
const now = computed(() => hours.value?.[0] ?? null)

const hourLabel = (time) => {
  const h = Number(time.slice(11, 13))
  return `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'am' : 'pm'}`
}

const generalSummary = computed(() => {
  const said = ['Right now in Singapore']
  if (crowdReal.value) {
    said.push(
      busiest.value.length
        ? `busiest MRT stations: ${busiest.value.map((s) => s.station).join(', ')}`
        : 'every MRT station is quiet',
    )
  }
  if (now.value) said.push(`${now.value.temp}°C, ${now.value.condition.toLowerCase()}`)
  if (haze.value) said.push(`haze PSI ${haze.value.psi}, ${haze.value.level.toLowerCase()}`)
  return said.join('; ') + '.'
})
</script>

<template>
  <!-- live: the whole fan opens that hangout -->
  <RouterLink
    v-if="mode === 'live' && cards"
    class="container fan fan--link"
    :to="cards.link"
    :aria-label="`${cards.summary} Open ${cards.name}.`"
  >
    <span class="fan__tag" aria-hidden="true">
      {{ cards.label }}<template v-if="cards.date"> · {{ cards.date }}</template>
    </span>

    <!-- left: fair for everyone, or who's still to add a start -->
    <div class="card card--left" aria-hidden="true">
      <template v-if="cards.trips.kind === 'trips'">
        <p class="card__title">Fair for everyone</p>
        <div v-for="t in cards.trips.rows" :key="t.id" class="trip">
          <span class="dot" :style="{ background: t.color }">{{ t.initial }}</span>
          <div>
            <b>{{ t.name }}</b>
            <div class="track">
              <span :class="{ long: t.longest }" :style="{ width: `${t.width}%` }"></span>
            </div>
          </div>
          <b class="trip__mins">{{ t.mins }} min</b>
        </div>
        <p class="card__note">
          <span class="chip">{{ cards.trips.gap }} min gap</span>
          <template v-if="cards.trips.soFar"> · {{ cards.trips.soFar }}</template>
          <template v-else-if="cards.trips.more"> · +{{ cards.trips.more }} more</template>
          <template v-else> longest to shortest</template>
        </p>
      </template>
      <template v-else>
        <p class="card__title">Starting points</p>
        <p class="big">
          {{ cards.trips.added }}<span> of {{ cards.trips.total }} added</span>
        </p>
        <div class="track track--big">
          <span
            :style="{ width: `${Math.round((cards.trips.added / cards.trips.total) * 100)}%` }"
          ></span>
        </div>
        <div v-if="cards.trips.missing.length" class="waiting">
          <span class="stack">
            <span
              v-for="p in cards.trips.missing.slice(0, 4)"
              :key="p.id"
              class="dot"
              :style="{ background: p.color }"
              >{{ p.initial }}</span
            >
          </span>
          <span class="card__note">{{ cards.trips.missingText }}</span>
        </div>
      </template>
    </div>

    <!-- middle: the spot, or the plan so far -->
    <div class="card card--middle" aria-hidden="true">
      <p class="card__label">{{ cards.spot.label }}</p>
      <template v-if="cards.spot.kind === 'spot'">
        <p class="card__name">{{ cards.spot.name }}</p>
        <p v-if="cards.spot.details" class="card__note">{{ cards.spot.details }}</p>
      </template>
      <p v-else class="card__note card__note--plan">{{ cards.spot.midpoint }}</p>
      <p v-if="cards.spot.status" class="card__note">{{ cards.spot.status }}</p>
      <div class="ticket">
        <div>
          <small>When</small><b>{{ cards.spot.when ?? 'No date yet' }}</b>
        </div>
        <div v-if="cards.spot.leave">
          <small>You leave by</small><b class="you">{{ cards.spot.leave }}</b>
        </div>
      </div>
    </div>

    <!-- right: when everyone leaves (anyone not ready yet comes last, greyed) -->
    <div class="card card--right" aria-hidden="true">
      <p class="card__title">{{ cards.times.title }}</p>
      <div
        v-for="p in cards.times.rows"
        :key="p.id"
        class="person"
        :class="{ 'person--waiting': !p.ready }"
      >
        <span
          class="dot"
          :class="{ 'dot--empty': !p.ready }"
          :style="p.ready ? { background: p.color } : null"
          >{{ p.initial }}</span
        >
        <div class="person__text">
          <b>{{ p.name }}</b>
          <span class="card__note">{{ p.detail }}</span>
        </div>
        <b v-if="p.time" class="person__time">{{ p.time }}</b>
      </div>
      <p v-if="cards.times.note || cards.times.more" class="card__note">
        <template v-if="cards.times.more"
          >+{{ cards.times.more }} more<template v-if="cards.times.note"> · </template></template
        >{{ cards.times.note }}
      </p>
    </div>
  </RouterLink>

  <!-- loading: the same three shapes, greyed out -->
  <div v-else-if="mode === 'loading'" class="container fan" aria-hidden="true">
    <div
      v-for="side in ['left', 'middle', 'right']"
      :key="side"
      class="card"
      :class="`card--${side}`"
    >
      <span class="ph ph--title"></span>
      <span class="ph"></span>
      <span class="ph"></span>
      <span class="ph ph--short"></span>
    </div>
  </div>

  <!-- general: true for anyone in Singapore right now -->
  <div v-else class="container fan" role="img" :aria-label="generalSummary">
    <span class="fan__tag" aria-hidden="true">Right now in Singapore</span>

    <!-- left: MRT crowds right now -->
    <div class="card card--left" aria-hidden="true">
      <p class="card__title">MRT crowds right now</p>
      <template v-if="stations === null">
        <span class="ph"></span>
        <span class="ph"></span>
        <span class="ph ph--short"></span>
      </template>
      <template v-else-if="crowdReal">
        <div v-for="s in busiest" :key="s.station" class="crowd">
          <span class="level" :class="`level--${s.level}`"></span>
          <b>{{ s.station }}</b>
          <span class="card__note">{{ LEVEL[s.level] }}</span>
        </div>
        <p v-if="!busiest.length" class="next">Every station is quiet right now.</p>
        <p class="card__note">
          <span class="chip">{{ quietCount }} quiet</span> stations · LTA DataMall
        </p>
      </template>
      <p v-else class="next">
        Fairpoint checks how busy each MRT station is, so your group can skip the crowds.
      </p>
    </div>

    <!-- middle: the weather now -->
    <div class="card card--middle" aria-hidden="true">
      <p class="card__label">Weather now</p>
      <template v-if="hours === null">
        <span class="ph ph--title"></span>
        <span class="ph"></span>
      </template>
      <template v-else-if="now">
        <div class="weather">
          <span class="weather__temp">{{ now.temp }}°C</span>
          <div>
            <b>{{ now.condition }}</b>
            <p class="card__note">
              Rain {{ now.rainChance }}%<template v-if="haze">
                · Haze: PSI {{ haze.psi }} {{ haze.level.toLowerCase() }}</template
              >
            </p>
          </div>
        </div>
        <div class="hours">
          <div v-for="(h, i) in hours" :key="h.time" :class="{ 'hours--now': i === 0 }">
            {{ i === 0 ? 'Now' : hourLabel(h.time) }}<b>{{ h.temp }}°</b>
          </div>
        </div>
      </template>
      <p v-else class="next">
        Fairpoint checks the forecast and haze for when you meet, so you can pick somewhere indoors.
      </p>
    </div>

    <!-- right: your group (no names: it's yours to fill in) -->
    <div class="card card--right" aria-hidden="true">
      <p class="card__title">Your group</p>
      <div class="group">
        <span class="dot dot--you">{{ you }}</span>
        <span class="dot dot--empty"></span>
        <span class="dot dot--empty"></span>
        <span class="dot dot--empty"></span>
      </div>
      <ol class="steps">
        <li><span class="level level--teal"></span>Everyone adds where they’re starting</li>
        <li><span class="level level--coral"></span>Fairpoint finds the fair MRT stop</li>
        <li><span class="level level--deep"></span>You vote on a place nearby</li>
      </ol>
    </div>
  </div>
</template>

<style scoped>
/* the fan, hanging over the edge into the next section */
.fan {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1.15fr 1fr;
  align-items: start;
  max-width: 1120px;
  margin-top: clamp(2.5rem, 4.5vw, 4rem);
  margin-bottom: calc(-1 * clamp(90px, 11vw, 150px));
  text-align: left;
  color: var(--fp-ink);
  text-decoration: none;
}

.fan--link:hover .card--left {
  transform: rotate(-3deg) translate(28px, 26px);
}

.fan--link:hover .card--right {
  transform: rotate(3deg) translate(-28px, 26px);
}

.fan--link:focus-visible {
  outline: 3px solid var(--fp-accent);
  outline-offset: 6px;
  border-radius: var(--fp-radius);
}

.fan__tag {
  position: absolute;
  top: -2.25rem;
  left: 50%;
  translate: -50% 0;
  padding: 0.3rem 0.9rem;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.16);
  color: #fff;
  font-size: 0.875rem;
  font-weight: 700;
  white-space: nowrap;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  min-height: 190px;
  padding: 1.25rem;
  border-radius: var(--fp-radius);
  background: var(--fp-surface);
  box-shadow: 0 24px 48px rgb(0 0 0 / 0.2);
  transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
  animation: rise 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 300ms both;
}

/* the middle card covers the inner edge of the side cards, so their text keeps clear of it */
.card--left {
  padding-right: 2.5rem;
  transform: rotate(-5deg) translate(28px, 40px);
}

.card--middle {
  position: relative;
  z-index: 1;
  animation-delay: 380ms;
}

.card--right {
  padding-left: 2.5rem;
  transform: rotate(5deg) translate(-28px, 40px);
  animation-delay: 460ms;
}

@keyframes rise {
  from {
    opacity: 0;
    translate: 0 24px;
  }
}

.card p {
  margin: 0;
}

.card__title {
  font-weight: 700;
}

.card__label {
  color: var(--fp-primary);
  font-size: 0.875rem;
  font-weight: 700;
}

.card__name {
  font-size: 1.35rem;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.card__note {
  color: var(--fp-muted);
  font-size: 0.875rem;
}

.card__note--plan {
  font-size: 1rem;
  font-weight: 600;
  color: var(--fp-ink);
}

.chip {
  padding: 2px 8px;
  border-radius: 99px;
  background: var(--fp-primary);
  color: #fff;
  font-size: 0.8125rem;
  font-weight: 700;
}

/* trips */
.trip {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.6rem;
  padding: 0.3rem 0;
}

.trip + .trip {
  border-top: 1px solid var(--fp-border);
}

.trip__mins {
  white-space: nowrap;
}

.dot {
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 800;
}

.track {
  height: 6px;
  margin-top: 4px;
  border-radius: 99px;
  background: var(--fp-bg-2);
  overflow: hidden;
}

.track--big {
  height: 8px;
}

.track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--fp-primary);
}

.track .long {
  background: var(--fp-accent);
}

.track .grey {
  background: var(--fp-muted);
}

.big {
  font-size: 2.2rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.03em;
}

.big span {
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0;
  color: var(--fp-muted);
}

.waiting {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.25rem;
}

.stack {
  display: flex;
}

.stack .dot + .dot {
  margin-left: -8px;
  box-shadow: 0 0 0 2px var(--fp-surface);
}

.next {
  font-weight: 600;
  line-height: 1.4;
}

/* the spot's ticket */
.ticket {
  display: grid;
  grid-template-columns: 1fr 1fr;
  margin-top: 0.5rem;
  border-radius: var(--fp-radius-sm);
  background: var(--fp-bg);
}

.ticket > div {
  padding: 0.6rem 0.75rem;
}

.ticket > div + div {
  border-left: 1px dashed var(--fp-border);
}

.ticket small {
  display: block;
  color: var(--fp-muted);
  font-size: 0.8125rem;
}

.you {
  color: var(--fp-primary);
}

/* when everyone leaves */
.person {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.6rem;
  padding: 0.3rem 0;
}

.person + .person {
  border-top: 1px solid var(--fp-border);
}

.person__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.25;
}

.person__time {
  white-space: nowrap;
}

.person--waiting b {
  color: var(--fp-muted);
}

.dot.dot--empty {
  border: 2px dashed var(--fp-border);
  background: transparent;
  color: var(--fp-muted);
}

/* general: crowds, weather, your group */
.crowd {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.6rem;
  padding: 0.3rem 0;
}

.level {
  display: inline-block;
  flex: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.level--h {
  background: var(--bs-danger);
}

.level--m {
  background: var(--bs-warning);
}

.level--l,
.level--teal {
  background: var(--fp-primary);
}

.level--coral {
  background: var(--fp-accent);
}

.level--deep {
  background: var(--fp-deep);
}

.weather {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.weather__temp {
  font-size: 2.4rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.hours {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  text-align: center;
  font-size: 0.8125rem;
}

.hours div {
  padding: 0.45rem 0;
  border-radius: 10px;
  background: var(--fp-bg);
}

.hours b {
  display: block;
}

.hours .hours--now {
  background: var(--fp-primary);
  color: #fff;
}

.group {
  display: flex;
  gap: 6px;
}

.dot--you {
  width: 34px;
  height: 34px;
  background: var(--fp-accent);
  color: var(--fp-deep);
}

.dot--empty {
  width: 34px;
  height: 34px;
  border: 2px dashed var(--fp-border);
}

.steps {
  display: grid;
  gap: 0.45rem;
  margin: 0.25rem 0 0;
  padding: 0;
  list-style: none;
  font-size: 0.9rem;
  font-weight: 600;
}

.steps li {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

/* loading placeholders */
.ph {
  display: block;
  height: 12px;
  border-radius: 99px;
  background: var(--fp-bg-2);
  animation: pulse 1.4s ease-in-out infinite;
}

.ph--title {
  width: 55%;
  height: 16px;
}

.ph--short {
  width: 40%;
}

@keyframes pulse {
  50% {
    opacity: 0.5;
  }
}

@media (max-width: 860px) {
  .card--left,
  .card--right {
    padding-inline: 1.25rem;
  }

  .fan {
    grid-template-columns: 1fr;
    max-width: 420px;
    margin-bottom: -90px;
  }

  .card--left,
  .card--right {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .card,
  .ph {
    animation: none;
  }
}
</style>
