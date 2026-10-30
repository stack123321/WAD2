<script setup>
// 08 midpoint + crowd heat map
// Owner: Ryan (heat map) + Surya (weather card, midpoint dragging) · Vet by: Eashvar
// midpoint (fairest mrt station, saved on 07) on a map with live crowds and weather, dragging the pin snaps to the nearest station and re-saves it
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useHangoutStore } from '@/stores/hangout'
import { useAuthStore } from '@/stores/auth'
import { nearestStations } from '@/utils/midpoint'
import { rankStations, scoreStation } from '@/services/routing'
import { saveMidpoint } from '@/services/hangouts'
import CrowdHeatmap from '@/components/heatmap/CrowdHeatmap.vue'
import WeatherCard from '@/components/weather/WeatherCard.vue'
import TravelTimePanel from '@/components/transport/TravelTimePanel.vue'
import MidpointSpots from '@/components/midpoint/MidpointSpots.vue'

const route = useRoute()
const store = useHangoutStore()
const auth = useAuthStore()

onMounted(async () => {
  await store.load(route.params.id)
  await loadRanking()
})

// (Surya) Why this station? Rank the 8 stations near the middle again (the same way 07 does), so
// we can explain the choice and offer the next best ones. Anyone who hasn't picked a mode counts
// as MRT, like on 07. (The routes were already worked out on 07, so the server has them saved.)
const ranked = ref([])
const rankedFor = ref([]) // the members in the same order as each station's travelMins

async function loadRanking() {
  if (!midpoint.value) return
  const people = store.members.filter((m) => m.start_lat != null)
  if (people.length === 0) return
  const withModes = []
  for (const m of people) {
    withModes.push({ ...m, mode: m.mode || 'mrt' })
  }
  try {
    ranked.value = await rankStations(withModes, 'fairest')
    rankedFor.value = people
    if (current.value) {
      showTimes(current.value)
    }
  } catch (err) {
    // only extra detail: the map, weather and midpoint still work without it
    console.error(err)
  }
}

// The saved midpoint's numbers from the ranking (null if it was dragged to a station further out)
const current = computed(() => {
  if (!midpoint.value) return null
  const found = ranked.value.find((r) => r.name === midpoint.value.name)
  if (!found) return null
  return found
})

const isFairest = computed(() => ranked.value.length > 0 && current.value === ranked.value[0])

// Put each person's time and cost to a station on them (for the travel-time bars)
function showTimes(station) {
  rankedFor.value.forEach((m, i) => {
    m.travel_mins = station.travelMins[i]
    m.travel_cost = station.travelCosts[i]
  })
}

// (Surya) Up to 3 other stations, each with why it's offered (the tab's tag):
// 1. the fairest one that isn't the midpoint
// 2. then the quickest station for each person, if it's quicker for them than the midpoint
//    (the prof: "all the alternatives end up longer for everyone")
// 3. then the next fairest ones, to fill up to 3
const otherOptions = computed(() => {
  if (!midpoint.value) return []
  const result = []
  const others = ranked.value.filter((r) => r.name !== midpoint.value.name)

  // Part (a) the fairest other station
  if (others.length > 0) {
    result.push({ ...others[0], tag: isFairest.value ? 'next fairest' : 'fairest' })
  }

  // Part (b) each person's quickest station
  rankedFor.value.forEach((m, i) => {
    if (result.length >= 3) return
    let best = null
    for (const r of others) {
      if (best === null || r.travelMins[i] < best.travelMins[i]) {
        best = r
      }
    }
    if (!best) return
    if (current.value && best.travelMins[i] >= current.value.travelMins[i]) return // no quicker
    if (result.some((o) => o.name === best.name)) return // already offered
    result.push({ ...best, tag: `quickest for ${m.display_name}` })
  })

  // Part (c) fill up with the next fairest
  for (const r of others) {
    if (result.length >= 3) break
    if (!result.some((o) => o.name === r.name)) {
      result.push({ ...r, tag: '' })
    }
  }
  return result
})

// "Ryan 12 min shorter · Nicole 8 min longer · Surya same. Trips up to 30 min apart (less fair)",
// compared with the current midpoint, in plain words
function compareLine(option) {
  const spread = `Trips up to ${option.gap} min apart`
  if (!current.value) {
    return `Longest trip ${option.longest} min · ${spread}`
  }
  const people = []
  rankedFor.value.forEach((m, i) => {
    people.push(
      `${m.display_name} ${longerText(option.travelMins[i] - current.value.travelMins[i])}`,
    )
  })
  return `${people.join(' · ')}. ${spread} (${fairerText(option.gap - current.value.gap)}).`
}

// 4 → "4 min longer", -19 → "19 min shorter", 0 → "same"
function longerText(n) {
  if (n === 0) return 'same'
  if (n > 0) return `${n} min longer`
  return `${Math.abs(n)} min shorter`
}

// smaller spread between trips = fairer
function fairerText(n) {
  if (n === 0) return 'just as fair'
  if (n > 0) return 'less fair'
  return 'fairer'
}

const longestTrip = computed(() => {
  let longest = 0
  for (const m of store.members) {
    if (m.travel_mins != null && m.travel_mins > longest) {
      longest = m.travel_mins
    }
  }
  return longest
})

// (Surya) Your own trip to the midpoint, e.g. "27 min by MRT · $2.20". Null if we don't know it
// yet (you haven't picked a mode, or the travel times haven't loaded), so the line is hidden.
// In the demo hangout (sample people) you're Surya, like on 06 and 07.
const myTrip = computed(() => {
  let myId = 'u-surya'
  if (route.params.id !== 'demo' && auth.user) {
    myId = auth.user.id
  }
  const me = store.members.find((m) => m.user_id === myId)
  if (!me || !me.mode || me.travel_mins == null) {
    return null
  }
  const modes = { mrt: 'MRT', bus: 'bus', car: 'car', walk: 'walking' }
  let cost
  if (me.mode === 'car') {
    cost = `$${Number(me.travel_cost).toFixed(2)}/h parking`
  } else if (me.mode === 'walk' || !me.travel_cost) {
    cost = 'free'
  } else {
    cost = `$${Number(me.travel_cost).toFixed(2)}`
  }
  return `${me.travel_mins} min by ${modes[me.mode]} · ${cost}`
})

// (Surya) The station tabs above "Things to do": your midpoint first, then the next best ones,
// each with a one-line comparison so you can weigh better spots against a longer trip
const stationTabs = computed(() => {
  if (!midpoint.value) return []
  const tabs = [{ ...midpoint.value, chosen: true, compareText: '', station: null }]
  for (const o of otherOptions.value) {
    tabs.push({
      name: o.name,
      lat: o.lat,
      lng: o.lng,
      chosen: false,
      tag: o.tag,
      compareText: compareLine(o),
      station: o,
    })
  }
  return tabs
})

// (Surya) The station tab being previewed: CrowdHeatmap moves there and shows a light pin
const previewStation = ref(null)
const spotsCard = ref(null) // MidpointSpots, so "Back to midpoint" can put its tabs back

function backToMidpoint() {
  if (spotsCard.value && midpoint.value) {
    spotsCard.value.selectTab(midpoint.value.name) // also clears the preview
  }
}

// "Make ___ our midpoint": make another station the midpoint, for everyone

async function chooseStation(station) {
  moveMessage.value = ''
  moveError.value = ''
  showTimes(station)
  store.hangout.midpoint_name = station.name
  store.hangout.midpoint_lat = station.lat
  store.hangout.midpoint_lng = station.lng
  store.hangout.avg_mins = station.average
  store.hangout.gap_mins = station.gap
  try {
    await saveMidpoint(route.params.id, {
      name: station.name,
      lat: station.lat,
      lng: station.lng,
      avgMins: station.average,
      gapMins: station.gap,
    })
    moveMessage.value = `Moved to ${station.name} MRT.`
  } catch (err) {
    console.error(err)
    moveError.value = `Moved to ${station.name} MRT on your screen, but couldn't save it for the group.`
  }
}

const midpoint = computed(() => {
  if (!store.hangout) return null
  // no midpoint until page 07 has worked it out (singapore's latitude never 0)
  if (!store.hangout.midpoint_lat) return null
  return {
    name: store.hangout.midpoint_name,
    lat: store.hangout.midpoint_lat,
    lng: store.hangout.midpoint_lng,
  }
})

// moving midpoint by dragging pin
const moving = ref(false)
const moveMessage = ref('')
const moveError = ref('')

async function onMidpointMoved(position) {
  // snap to closest mrt station to where pin dropped
  const station = nearestStations(position, 1)[0]
  moving.value = true
  moveMessage.value = ''
  moveError.value = ''

  // everyone's travel time to the new station, if we know how they're travelling (from 07)
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

  // show straight away, then save it for the group
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
    <!-- the step bar comes from App.vue, which adds it to every hangout page -->
    <main class="container py-4">
      <h1 class="h3 mb-3">Midpoint + crowd heat map</h1>

      <template v-if="midpoint">
        <!-- (Surya) What you can do near the midpoint, before choosing spots -->
        <MidpointSpots
          ref="spotsCard"
          :stations="stationTabs"
          :vibes="store.hangout.vibe || []"
          :hangout-id="route.params.id"
          :busy="moving"
          @choose="chooseStation"
          @preview="previewStation = $event"
        />

        <!-- the map, with the midpoint, everyone's travel times and the weather beside it -->
        <div class="row g-4 mt-1">
          <!-- big map: the midpoint pin (draggable) and live crowds at the stations around it -->
          <div class="col-lg-8 d-flex flex-column gap-3">
            <CrowdHeatmap
              :midpoint="midpoint"
              :draggable="true"
              :members="store.members"
              :preview="previewStation"
              @move="onMidpointMoved"
              @recenter="backToMidpoint"
            />
          </div>

          <!-- beside it: the midpoint, then the weather there -->
          <div class="col-lg-4 d-flex flex-column gap-3">
            <section class="card">
              <div class="card-body">
                <p class="eyebrow mb-1">Your fair midpoint</p>
                <h2 class="h4 fw-bold mb-1">{{ midpoint.name }} MRT</h2>
                <!-- (Surya) Your own trip there, only when we know it -->
                <p v-if="myTrip" class="my-trip mb-0">
                  <span class="text-secondary">Your trip:</span> {{ myTrip }}
                </p>
                <p class="small mt-2 mb-0">
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

            <!-- (Surya) Everyone's travel time to the midpoint -->
            <TravelTimePanel
              v-if="longestTrip > 0"
              :members="store.members"
              :station-name="midpoint.name"
              :longest="longestTrip"
              :subtitle="
                isFairest || !current
                  ? 'The fairest MRT station near the middle of everyone\'s starting points'
                  : 'The station your group chose'
              "
            />

            <WeatherCard
              :lat="midpoint.lat"
              :lng="midpoint.lng"
              :place="midpoint.name"
              :at="store.hangout.starts_at"
            />
          </div>
        </div>
        <!-- (Surya) the next step, full width at the bottom so it's clear what to do next -->
        <router-link
          :to="{ name: 'explore', params: { id: route.params.id } }"
          class="btn btn-primary btn-lg w-100 mt-4 see-spots-btn"
        >
          Next: see nearby spots →
        </router-link>
        <p class="small text-secondary text-center mt-2 mb-0">
          Pick places near {{ midpoint.name }} for the group to vote on.
        </p>
      </template>

      <!-- reached from the step bar before page 07 has found the midpoint -->
      <div v-else class="alert alert-info" role="status">
        <p class="mb-2">
          No midpoint yet. Fairpoint finds it once everyone has picked how they're travelling.
        </p>
        <router-link
          :to="{ name: 'transport', params: { id: route.params.id } }"
          class="btn btn-primary btn-sm go-btn"
        >
          Go to transport →
        </router-link>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* the Go to transport button, 44px tall so it is easy to tap */
.go-btn {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
}

/* big enough to tap with a finger */
.see-spots-btn {
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

/* (Surya) "Your trip: 27 min by MRT · $2.20" */
.my-trip {
  font-size: 0.9rem;
  font-weight: 600;
}

.min-w-0 {
  min-width: 0;
}

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
