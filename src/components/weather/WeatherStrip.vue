<script setup>
// Owner: Surya. One-line weather for a spot, for 10 Spot details and 12 Final plan (Figma frame 10):
// "29°C · Partly cloudy at 7 PM / Rain chance rises to 60% at 8 PM, good thing it's indoors"
// Usage: <WeatherStrip :lat="spot.lat" :lng="spot.lng" :at="hangout.starts_at" :indoor="true" />
import { computed, onMounted, ref, watch } from 'vue'
import { getHaze, getHourlyForecast, hourLabel, sgHourKey } from '@/services/weather'
import WeatherIcon from './WeatherIcon.vue'
import WeatherFrame from './WeatherFrame.vue'

const props = defineProps({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  at: { type: String, default: null }, // ISO time of the hangout; leave out for "now"
  indoor: { type: Boolean, default: null }, // null = we don't know if the spot is indoors
})

const hours = ref([])
const haze = ref(null)
const loading = ref(true)
const error = ref(false)

const RAINY = 40 // % chance of rain worth mentioning

// Part (a) Load the hourly forecast and haze
async function loadData() {
  loading.value = true
  error.value = false
  try {
    hours.value = await getHourlyForecast(props.lat, props.lng)
  } catch (err) {
    console.error(err)
    error.value = true
  }
  loading.value = false

  // Haze is extra: if it fails, the strip still shows the forecast
  try {
    haze.value = await getHaze(props.lat, props.lng)
  } catch (err) {
    console.error(err)
  }
}

onMounted(loadData)
watch(() => [props.lat, props.lng], loadData)

// Part (b) The hour of the hangout (or now)
const index = computed(() => {
  let when = new Date().toISOString()
  if (props.at) {
    when = props.at
  }
  const key = sgHourKey(when)
  return hours.value.findIndex((h) => h.time === key)
})

const current = computed(() => {
  if (index.value === -1) {
    return null
  }
  return hours.value[index.value]
})

// Part (c) Second line: what the rain does over the next 3 hours, and whether the spot copes
const rainNote = computed(() => {
  const now = current.value
  if (!now) {
    return ''
  }

  // the wettest of the next 3 hours (best-so-far loop)
  let wettest = now
  const nextHours = hours.value.slice(index.value + 1, index.value + 4)
  for (const h of nextHours) {
    if (h.rainChance > wettest.rainChance) {
      wettest = h
    }
  }

  let note
  const rainGetsWorse = wettest !== now && wettest.rainChance > now.rainChance + 10
  if (rainGetsWorse && wettest.rainChance >= RAINY) {
    note = `Rain chance rises to ${wettest.rainChance}% at ${hourLabel(wettest.time)}`
  } else if (now.rainChance >= RAINY) {
    note = `${now.rainChance}% chance of rain`
  } else {
    return 'Low chance of rain'
  }

  if (props.indoor === true) {
    return `${note}, good thing it's indoors`
  }
  if (props.indoor === false) {
    return `${note}, bring an umbrella`
  }
  return note
})
</script>

<template>
  <WeatherFrame compact>
    <div v-if="loading" class="placeholder-glow w-100" aria-busy="true">
      <span class="placeholder col-8 rounded"></span>
    </div>

    <p v-else-if="error || !current" class="small text-secondary mb-0">
      {{ error ? "Weather isn't available right now." : 'No forecast for this time yet.' }}
    </p>

    <template v-else>
      <WeatherIcon :kind="current.kind" :size="44" :label="current.condition" />
      <div class="min-w-0">
        <div class="fw-semibold">
          {{ current.temp }}°C · {{ current.condition }} at {{ hourLabel(current.time) }}
        </div>
        <div class="small text-secondary">
          {{ rainNote }}
          <template v-if="haze && haze.tone !== 'good'">
            · Haze: PSI {{ haze.psi }} ({{ haze.level.toLowerCase() }})
          </template>
        </div>
      </div>
    </template>
  </WeatherFrame>
</template>

<style scoped>
.min-w-0 {
  min-width: 0;
}
</style>
