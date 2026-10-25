<script setup>
// Owner: Surya. "Weather" card for 05 New hangout, to help pick a dry day.
// (It used to be on 04 Dashboard; Ryan's dashboard redesign took it off there.)
// Shows 5 days at a time, with ‹ › to move 5 days back or forward. The forecast goes as far as
// there is one: NEA's official forecast for the next ~4 days, then Open-Meteo up to 16 days ahead.
// Days further away still show (and can be picked), marked "no forecast yet".
// Usage: <WeekForecast />
//   or, to pick a date by tapping a day: <WeekForecast pickable :selected-date="form.date"
//     @pick="form.date = $event" />   (pick → the day's date, e.g. "2026-10-24")
//   When selected-date changes (e.g. typed in the date box), the card jumps to the 5 days around it.
import { computed, onMounted, ref, watch } from 'vue'
import {
  getDayForecast,
  getHaze,
  getTodayForecast,
  getWeekForecast,
  sgHourKey,
  weatherKind,
} from '@/services/weather'
import WeatherIcon from './WeatherIcon.vue'
import HazeBadge from './HazeBadge.vue'
import WeatherFrame from './WeatherFrame.vue'

const props = defineProps({
  pickable: { type: Boolean, default: false }, // each day is a button that picks that date
  selectedDate: { type: String, default: '' }, // "2026-10-24": highlights that day
})

const emit = defineEmits(['pick'])

const SHOW = 5 // days shown at a time
const FURTHEST = 16 // Open-Meteo forecasts up to 16 days ahead

const forecasts = ref([]) // every day we have a forecast for, in date order
const haze = ref(null)
const loading = ref(true)
const error = ref(false)

// Singapore's date today, e.g. "2026-10-25"
const today = sgHourKey(new Date()).slice(0, 10)

// The first of the 5 days on show
const startDate = ref(today)

// Part (a) Load the forecasts and haze when the card appears
async function loadData() {
  const list = []

  // NEA first (official): today, then the outlook. The outlook can start today (depending on
  // when NEA issued it), so only add days after the last one. Dates look like "2026-10-21",
  // so comparing them as text works.
  try {
    list.push(await getTodayForecast())
    const outlook = await getDayForecast()
    for (const day of outlook) {
      if (day.date > list[list.length - 1].date) {
        list.push(day)
      }
    }
  } catch (err) {
    console.error(err) // NEA failed: Open-Meteo below fills in every day instead
  }

  // Then Open-Meteo for the days after that, as far as it goes (NEA only goes ~4 days ahead)
  try {
    const later = await getWeekForecast(FURTHEST)
    for (const day of later) {
      const lastDate = list.length > 0 ? list[list.length - 1].date : ''
      if (day.date > lastDate) {
        list.push(day)
      }
    }
  } catch (err) {
    console.error(err)
  }

  forecasts.value = list
  if (list.length === 0) {
    error.value = true
  }
  loading.value = false

  // Haze is extra: if it fails, the card still shows the forecast
  try {
    haze.value = await getHaze()
  } catch (err) {
    console.error(err)
  }
}

onMounted(() => {
  showDate(props.selectedDate)
  loadData()
})

// Part (b) Which 5 days are on show
// "2026-10-30" + 3 days → "2026-11-02" (noon UTC, so time zones can't shift the day)
function addDays(date, days) {
  const d = new Date(date + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// The 5 days from startDate. A day without a forecast (too far ahead) has forecast: null.
const shownDays = computed(() => {
  const result = []
  for (let i = 0; i < SHOW; i++) {
    const date = addDays(startDate.value, i)
    const found = forecasts.value.find((f) => f.date === date)
    if (found) {
      result.push(found)
    } else {
      result.push({ date: date, forecast: null, high: null })
    }
  }
  return result
})

// Any of the 5 days without a forecast? Then say why.
const someNotOut = computed(() => shownDays.value.some((d) => d.forecast === null))

// ‹ › move 5 days at a time (never before today)
function earlier() {
  const date = addDays(startDate.value, -SHOW)
  startDate.value = date < today ? today : date
}

function later() {
  startDate.value = addDays(startDate.value, SHOW)
}

// Show the 5 days around a date (2 before it, if that isn't before today)
function showDate(date) {
  if (!date || date < today) {
    return
  }
  const lastShown = addDays(startDate.value, SHOW - 1)
  if (date >= startDate.value && date <= lastShown) {
    return // already on show
  }
  const start = addDays(date, -2)
  startDate.value = start < today ? today : start
}

// A date picked anywhere (date box, quick dates, tapping a day) brings its 5 days into view
watch(() => props.selectedDate, showDate)

// Part (c) Labels
// "2026-10-31" → "31"
function dayOfMonth(date) {
  return String(Number(date.slice(8, 10)))
}

// "2026-10-31" → "Sat", or "Today"
function dayLabel(date) {
  if (date === today) {
    return 'Today'
  }
  return new Date(date + 'T12:00:00Z').toLocaleDateString('en-SG', {
    weekday: 'short',
    timeZone: 'UTC',
  })
}

// "26 Oct – 30 Oct" for the header
const rangeText = computed(() => {
  const first = new Date(startDate.value + 'T12:00:00Z')
  const last = new Date(addDays(startDate.value, SHOW - 1) + 'T12:00:00Z')
  const options = { day: 'numeric', month: 'short', timeZone: 'UTC' }
  return `${first.toLocaleDateString('en-SG', options)} – ${last.toLocaleDateString('en-SG', options)}`
})

function dayTitle(day) {
  if (day.forecast === null) {
    return 'No forecast yet'
  }
  return day.forecast
}
</script>

<template>
  <WeatherFrame>
    <template #header>
      <h2 class="h6 fw-bold mb-0">Weather</h2>
      <span
        class="source-tag"
        title="NEA (data.gov.sg) for the next few days, Open-Meteo after that"
        >NEA · Open-Meteo</span
      >
    </template>

    <div v-if="loading" class="days" aria-busy="true">
      <div v-for="n in 5" :key="n" class="day">
        <span class="placeholder-glow"><span class="placeholder col-12 rounded"></span></span>
      </div>
    </div>

    <p v-else-if="error" class="small text-secondary mb-0">
      Weather isn't available right now. Try again later.
    </p>

    <template v-else>
      <!-- ‹ 26 Oct – 30 Oct › : move 5 days at a time -->
      <div class="range-row">
        <button
          type="button"
          class="arrow"
          :disabled="startDate <= today"
          aria-label="Earlier days"
          @click="earlier"
        >
          ‹
        </button>
        <span class="range-text">{{ rangeText }}</span>
        <button type="button" class="arrow" aria-label="Later days" @click="later">›</button>
      </div>

      <ul class="days list-unstyled mb-0">
        <li v-for="day in shownDays" :key="day.date" :title="dayTitle(day)">
          <!-- pickable: tap a day to choose that date for the hangout -->
          <button
            v-if="pickable"
            type="button"
            class="day day--button"
            :class="{ 'day--on': day.date === selectedDate }"
            :aria-pressed="day.date === selectedDate"
            :aria-label="`${dayLabel(day.date)} ${dayOfMonth(day.date)}, ${dayTitle(day)}. Pick this day`"
            @click="emit('pick', day.date)"
          >
            <span class="small text-secondary">{{ dayLabel(day.date) }}</span>
            <span class="day-date">{{ dayOfMonth(day.date) }}</span>
            <WeatherIcon
              v-if="day.forecast"
              :kind="weatherKind(day.forecast)"
              :label="day.forecast"
            />
            <span v-else class="no-forecast" aria-hidden="true">–</span>
            <span class="fw-semibold">{{ day.high !== null ? `${day.high}°` : '' }}</span>
          </button>
          <div v-else class="day">
            <span class="small text-secondary">{{ dayLabel(day.date) }}</span>
            <span class="day-date">{{ dayOfMonth(day.date) }}</span>
            <WeatherIcon
              v-if="day.forecast"
              :kind="weatherKind(day.forecast)"
              :label="day.forecast"
            />
            <span v-else class="no-forecast" aria-hidden="true">–</span>
            <span class="fw-semibold">{{ day.high !== null ? `${day.high}°` : '' }}</span>
          </div>
        </li>
      </ul>

      <p v-if="someNotOut" class="small text-secondary mt-2 mb-0">
        “–” = no forecast yet. Forecasts come out about 2 weeks before.
      </p>
    </template>

    <template v-if="haze" #footer>
      <HazeBadge :haze="haze" />
    </template>
  </WeatherFrame>
</template>

<style scoped>
.source-tag {
  white-space: nowrap; /* keep "NEA · Open-Meteo" on one line */
  background: var(--fp-bg);
  border-radius: 999px;
  padding: 0.2rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 600;
}

/* ‹ 26 Oct – 30 Oct › */
.range-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.range-text {
  font-size: 0.85rem;
  font-weight: 600;
}

.arrow {
  width: 44px;
  height: 44px;
  border: 1px solid var(--fp-border);
  border-radius: 50%;
  background: var(--fp-surface);
  color: var(--fp-ink);
  font-size: 1.25rem;
  line-height: 1;
}

.arrow:disabled {
  opacity: 0.35;
}

/* always 5 days in a row */
.days {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.35rem;
}

.day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
}

.day-date {
  font-size: 0.75rem;
  color: var(--fp-muted);
  line-height: 1;
}

.no-forecast {
  display: grid;
  place-items: center;
  height: 28px;
  color: var(--fp-muted);
  font-weight: 700;
}

/* Tap a day to pick it */
.day--button {
  width: 100%;
  min-height: 44px;
  padding: 0.4rem 0.1rem;
  border: 1px solid transparent;
  border-radius: var(--fp-radius-sm);
  background: transparent;
  color: var(--fp-ink);
}

.day--button:hover {
  border-color: var(--fp-border);
}

.day--on {
  border-color: var(--fp-primary);
  background: color-mix(in srgb, var(--fp-primary) 10%, var(--fp-surface));
}
</style>
