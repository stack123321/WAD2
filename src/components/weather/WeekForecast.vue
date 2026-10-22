<script setup>
// Owner: Surya. "Weather this week" card for 05 New hangout, to help pick a dry day.
// (It used to be on 04 Dashboard; Ryan's dashboard redesign took it off there.)
// Today + the next few days from NEA (up to 4), each with an icon and the day's high, plus haze.
// Usage: <WeekForecast />
import { onMounted, ref } from 'vue'
import { getDayForecast, getHaze, getTodayForecast, weatherKind } from '@/services/weather'
import WeatherIcon from './WeatherIcon.vue'
import HazeBadge from './HazeBadge.vue'
import WeatherFrame from './WeatherFrame.vue'

const days = ref([])
const haze = ref(null)
const loading = ref(true)
const error = ref(false)

// Part (a) Load the forecast and haze when the card appears
async function loadData() {
  try {
    const today = await getTodayForecast()
    const outlook = await getDayForecast()

    // The outlook can start today (depending on when NEA issued it), so only add the days
    // after today. Dates look like "2026-10-21", so comparing them as text works.
    const list = [today]
    for (const day of outlook) {
      if (day.date > today.date) {
        list.push(day)
      }
    }
    days.value = list
  } catch (err) {
    console.error(err)
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

onMounted(loadData)

// "2026-10-10" → "Sat"
function weekday(date) {
  return new Date(date + 'T12:00:00Z').toLocaleDateString('en-SG', {
    weekday: 'short',
    timeZone: 'UTC',
  })
}
</script>

<template>
  <WeatherFrame>
    <template #header>
      <h2 class="h6 fw-bold mb-0">Weather this week</h2>
      <span class="source-tag" title="Forecast from NEA (data.gov.sg)">NEA</span>
    </template>

    <div v-if="loading" class="days" aria-busy="true">
      <div v-for="n in 5" :key="n" class="day">
        <span class="placeholder-glow"><span class="placeholder col-12 rounded"></span></span>
      </div>
    </div>

    <p v-else-if="error" class="small text-secondary mb-0">
      Weather isn't available right now. Try again later.
    </p>

    <ul v-else class="days list-unstyled mb-0">
      <li v-for="(day, i) in days" :key="day.date" class="day" :title="day.forecast">
        <span class="small text-secondary">{{ i === 0 ? 'Today' : weekday(day.date) }}</span>
        <WeatherIcon :kind="weatherKind(day.forecast)" :label="day.forecast" />
        <span class="fw-semibold">{{ day.high }}°</span>
      </li>
    </ul>

    <template v-if="haze" #footer>
      <HazeBadge :haze="haze" />
    </template>
  </WeatherFrame>
</template>

<style scoped>
.source-tag {
  background: var(--fp-bg);
  border-radius: 999px;
  padding: 0.2rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.days {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.5rem;
}

.day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
}
</style>
