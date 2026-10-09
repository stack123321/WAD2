<script setup>
// Owner: Surya. "Weather at Bishan" card for 08 Midpoint (Figma frame 08).
// Forecast at the hangout's time: temperature, rain chance, humidity, UV, haze, the hours around
// it, and a warning if showers are coming.
// Usage: <WeatherCard :lat="h.midpoint_lat" :lng="h.midpoint_lng" :place="h.midpoint_name" :at="h.starts_at" />
import { computed, onMounted, ref, watch } from 'vue'
import {
  dayTimeLabel,
  getHaze,
  getHourlyForecast,
  hourLabel,
  sgHourKey,
  uvLevel,
} from '@/services/weather'
import WeatherIcon from './WeatherIcon.vue'
import HazeBadge from './HazeBadge.vue'

const props = defineProps({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  place: { type: String, required: true }, // e.g. "Bishan"
  at: { type: String, default: null }, // ISO time of the hangout; leave out for "now"
})

const hours = ref([])
const haze = ref(null)
const loading = ref(true)
const error = ref(false)

const RAIN_LIKELY = 50 // % chance of rain we call "likely"

async function load() {
  loading.value = true
  error.value = false
  try {
    hours.value = await getHourlyForecast(props.lat, props.lng)
  } catch (err) {
    console.error(err)
    error.value = true
  } finally {
    loading.value = false
  }
  // Haze is extra: if it fails, the card still shows the forecast
  getHaze(props.lat, props.lng)
    .then((h) => (haze.value = h))
    .catch((err) => console.error(err))
}

onMounted(load)
watch(() => [props.lat, props.lng], load)

const when = computed(() => props.at ?? new Date().toISOString())
const index = computed(() => hours.value.findIndex((h) => h.time === sgHourKey(when.value)))
const current = computed(() => hours.value[index.value] ?? null)

// 2 hours before to 2 hours after the hangout
const strip = computed(() => {
  const i = index.value
  if (i === -1) return []
  return hours.value.slice(Math.max(0, i - 2), i + 3)
})

// The forecast only covers today to 16 days ahead
const outOfRange = computed(() => {
  if (current.value || hours.value.length === 0) return ''
  return new Date(when.value) < new Date()
    ? 'This hangout has already happened.'
    : 'The forecast for this day comes out about 2 weeks before.'
})

// "Showers likely from 8 PM": the first hour from the hangout onwards with a high rain chance
const rainWarning = computed(() => {
  const i = index.value
  if (i === -1) return ''
  const wet = hours.value.slice(i, i + 4).find((h) => h.rainChance >= RAIN_LIKELY)
  if (!wet) return ''
  return wet === current.value
    ? `Rain likely at ${hourLabel(wet.time)} · indoor spots are a safer bet`
    : `Showers likely from ${hourLabel(wet.time)} · indoor spots are a safer bet`
})
</script>

<template>
  <section class="weather-card">
    <div class="d-flex justify-content-between align-items-center gap-2 mb-3">
      <h2 class="h6 fw-bold mb-0">Weather at {{ place }}</h2>
      <span class="time-chip">{{ dayTimeLabel(when) }}</span>
    </div>

    <div v-if="loading" class="placeholder-glow" aria-busy="true">
      <span class="placeholder col-6 rounded mb-3" style="height: 48px"></span>
      <span class="placeholder col-12 rounded" style="height: 90px"></span>
    </div>

    <p v-else-if="error" class="small text-secondary mb-0">
      Weather isn't available right now. Try again later.
    </p>

    <p v-else-if="outOfRange" class="small text-secondary mb-0">{{ outOfRange }}</p>

    <template v-else-if="current">
      <div class="d-flex align-items-center gap-3 mb-3">
        <WeatherIcon :kind="current.kind" :size="56" :label="current.condition" />
        <div>
          <div class="big-temp">{{ current.temp }}°C</div>
          <div class="text-secondary">{{ current.condition }}</div>
        </div>
      </div>

      <div class="d-flex flex-wrap gap-2 mb-3">
        <span class="chip chip-rain">Rain {{ current.rainChance }}%</span>
        <span class="chip">Humidity {{ current.humidity }}%</span>
        <span class="chip">UV {{ uvLevel(current.uv).toLowerCase() }}</span>
        <HazeBadge v-if="haze" :haze="haze" />
      </div>

      <ul class="hours list-unstyled">
        <li
          v-for="h in strip"
          :key="h.time"
          class="hour"
          :class="{ now: h === current }"
          :title="`${h.condition}, ${h.rainChance}% rain`"
        >
          <span class="small">{{ hourLabel(h.time) }}</span>
          <WeatherIcon :kind="h.kind" :size="24" :label="h.condition" />
          <span class="fw-semibold">{{ h.temp }}°</span>
        </li>
      </ul>

      <p v-if="rainWarning" class="warning small mb-2">
        <span class="dot" aria-hidden="true"></span>{{ rainWarning }}
      </p>
    </template>

    <p class="source small mb-0">Source: Open-Meteo (forecast) · data.gov.sg (NEA haze)</p>
  </section>
</template>

<style scoped>
.weather-card {
  background: var(--fp-surface);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
  box-shadow: var(--fp-shadow);
  padding: 1.5rem;
}

.time-chip,
.chip {
  background: var(--fp-bg);
  border-radius: 999px;
  padding: 0.25rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap;
}

.chip-rain {
  color: var(--bs-blue);
  background: color-mix(in srgb, var(--bs-blue) 12%, var(--fp-surface));
}

.big-temp {
  font-size: 2.25rem;
  font-weight: 800;
  line-height: 1;
}

.hours {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.25rem;
  background: var(--fp-bg);
  border-radius: var(--fp-radius-sm);
  padding: 0.75rem 0.5rem;
  margin-bottom: 0.75rem;
}

.hour {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  color: var(--fp-muted);
}

.hour.now {
  color: var(--fp-ink);
  font-weight: 700;
}

.warning {
  color: var(--fp-accent);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.warning .dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.source {
  color: var(--fp-muted);
}
</style>
