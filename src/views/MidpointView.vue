<script setup>
// 08 Midpoint + crowd heat map
// Owner: Ryan (heat map) + Surya (weather card, midpoint dragging) · Vet by: Eashvar
// Shows the group's midpoint (the fairest MRT station, saved on 07) on a big map with live crowds
// at the stations around it, and the weather there. Dragging the pin moves the midpoint to the
// nearest MRT station, works out everyone's travel time to it again, and saves it for the group.
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useHangoutStore } from '@/stores/hangout'
import { nearestStations } from '@/utils/midpoint'
import { scoreStation } from '@/services/routing'
import { saveMidpoint } from '@/services/hangouts'
import CrowdHeatmap from '@/components/heatmap/CrowdHeatmap.vue'
import WeatherCard from '@/components/weather/WeatherCard.vue'

const route = useRoute()
const store = useHangoutStore()

onMounted(() => store.load(route.params.id))

const midpoint = computed(() => {
  if (!store.hangout) return null
  // No midpoint until page 07 has worked it out (Singapore's latitude is never 0)
  if (!store.hangout.midpoint_lat) return null
  return {
    name: store.hangout.midpoint_name,
    lat: store.hangout.midpoint_lat,
    lng: store.hangout.midpoint_lng,
  }
})

// Moving the midpoint by dragging its pin
const moving = ref(false)
const moveMessage = ref('')
const moveError = ref('')

async function onMidpointMoved(position) {
  // Snap to the closest MRT station to where the pin was dropped
  const station = nearestStations(position, 1)[0]
  moving.value = true
  moveMessage.value = ''
  moveError.value = ''

  // Everyone's travel time to the new station, if we know how they're travelling (from 07)
  let avgMins = null
  let gapMins = null
  const travellers = store.members.filter((m) => m.mode && m.start_lat != null)
  if (travellers.length > 0) {
    try {
      const scored = await scoreStation(travellers, station)
      avgMins = scored.average
      gapMins = scored.gap
      travellers.forEach((m, i) => {
        m.travel_mins = scored.travelMins[i]
        m.travel_cost = scored.travelCosts[i]
      })
    } catch (err) {
      console.error(err)
    }
  }

  // Show it straight away, then save it for the group
  store.hangout.midpoint_name = station.name
  store.hangout.midpoint_lat = station.lat
  store.hangout.midpoint_lng = station.lng
  store.hangout.avg_mins = avgMins
  store.hangout.gap_mins = gapMins

  try {
    await saveMidpoint(route.params.id, {
      name: station.name,
      lat: station.lat,
      lng: station.lng,
      avgMins: avgMins,
      gapMins: gapMins,
    })
    moveMessage.value = `Moved to ${station.name} MRT.`
  } catch (err) {
    console.error(err)
    moveError.value = `Moved to ${station.name} MRT on your screen, but couldn't save it for the group.`
  }
  moving.value = false
}
</script>

<template>
  <div
    v-if="store.loading"
    class="d-flex align-items-center gap-2 text-secondary p-5"
    role="status"
  >
    <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
    Loading hangout…
  </div>

  <div v-else-if="store.error" class="container py-5">
    <div class="alert alert-danger" role="alert">
      Couldn't load this hangout. Check the link, or go back to
      <RouterLink :to="{ name: 'dashboard' }">My hangouts</RouterLink>.
    </div>
  </div>

  <div v-else-if="store.hangout">
    <!-- The step bar comes from App.vue, which adds it to every hangout page -->
    <main class="container py-4">
      <h1 class="h3 mb-3">Midpoint + crowd heat map</h1>

      <template v-if="midpoint">
        <div class="row g-4">
          <!-- Big map: the midpoint pin (draggable) and live crowds at the stations around it -->
          <div class="col-lg-8">
            <CrowdHeatmap :midpoint="midpoint" :draggable="true" @move="onMidpointMoved" />
          </div>

          <!-- Beside it: the midpoint, then the weather there -->
          <div class="col-lg-4 d-flex flex-column gap-3">
            <section class="card">
              <div class="card-body">
                <p class="eyebrow mb-1">Your fair midpoint</p>
                <h2 class="h4 fw-bold mb-1">{{ midpoint.name }} MRT</h2>
                <p v-if="store.hangout.avg_mins != null" class="small text-secondary mb-2">
                  {{ store.hangout.avg_mins }} min average · {{ store.hangout.gap_mins }} min gap
                  between trips
                </p>
                <p class="small mb-0">
                  <strong>Tip:</strong> drag the pin on the map to move the midpoint to another MRT
                  station nearby.
                </p>
                <p v-if="moving" class="small text-secondary mt-2 mb-0" role="status">
                  Working out travel times…
                </p>
                <p v-else-if="moveMessage" class="small save-ok mt-2 mb-0">✓ {{ moveMessage }}</p>
                <p v-if="moveError" class="small text-danger mt-2 mb-0" role="alert">
                  {{ moveError }}
                </p>
              </div>
            </section>

            <WeatherCard
              :lat="midpoint.lat"
              :lng="midpoint.lng"
              :place="midpoint.name"
              :at="store.hangout.starts_at"
            />
          </div>
        </div>
        <router-link
          :to="{ name: 'explore', params: { id: route.params.id } }"
          class="btn btn-primary mt-3"
        >
          See nearby spots
        </router-link>
      </template>

      <!-- Reached from the step bar before page 07 has found the midpoint -->
      <div v-else class="alert alert-info" role="status">
        <p class="mb-2">
          No midpoint yet. Fairpoint finds it once everyone has picked how they're travelling.
        </p>
        <router-link
          :to="{ name: 'transport', params: { id: route.params.id } }"
          class="btn btn-primary btn-sm"
        >
          Go to transport →
        </router-link>
      </div>
    </main>
  </div>
</template>

<style scoped>
.eyebrow {
  color: var(--fp-accent);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.save-ok {
  color: var(--fp-primary);
  font-weight: 600;
}
</style>
