<script setup>
// Owner: Surya. "Things to do near Bishan" on 08 Midpoint: photo cards of spots near a station
// that match the hangout's vibe, so the group knows what they can do there before choosing.
// Station tabs on top: tap another nearby station to PREVIEW its spots (nothing changes for the
// group), see the trade-off ("Longest trip 49 min (+4)…"), and tap "Make ___ our midpoint" to
// switch. Each card opens the spot's page (10). "See all spots" goes to 09.
// Uses Hugo's searchNearby() (Google Places, 800 m around the station). Google Places calls are
// off until someone switches them on (they count towards a free quota), so the switch is shown
// right here. Each station's spots are loaded only when its tab is opened, and remembered.
// Usage: <MidpointSpots :stations="tabs" :vibes="hangout.vibe" :hangout-id="hangout.id"
//          @choose="chooseStation" />
//   stations = [{ name, lat, lng, chosen, tag, compareText, station }], the chosen midpoint first
//   choose → the ranked station to make the midpoint
//   preview → { name, lat, lng } of the station being previewed (the map moves there), or null
//   The page can call selectTab(name) (through a template ref) to go back to the midpoint's tab.
import { computed, onMounted, ref, watch } from 'vue'
import { googlePlacesEnabled, searchNearby } from '@/services/places'
import { CATEGORY_EMOJI, categoriesForVibes } from '@/utils/vibes'
import GooglePlacesToggle from '@/components/ui/GooglePlacesToggle.vue'

const props = defineProps({
  stations: { type: Array, required: true },
  vibes: { type: Array, default: () => [] }, // e.g. ['chill', 'food']
  hangoutId: { type: String, required: true },
  busy: { type: Boolean, default: false }, // the page is saving a new midpoint
})

const emit = defineEmits(['choose', 'preview'])

// Which tab is open (a station name). Starts on the chosen midpoint.
const selectedName = ref('')

const station = computed(() => {
  const found = props.stations.find((s) => s.name === selectedName.value)
  if (found) {
    return found
  }
  return props.stations[0]
})

// When the midpoint changes (chosen here, or the pin was dragged), go back to its tab
const chosenName = computed(() => (props.stations[0] ? props.stations[0].name : ''))
watch(chosenName, () => {
  selectTab(chosenName.value)
})

// Open a tab, and tell the page which station to show on the map (null = the midpoint)
function selectTab(name) {
  selectedName.value = name
  const found = props.stations.find((s) => s.name === name)
  if (found && !found.chosen) {
    emit('preview', { name: found.name, lat: found.lat, lng: found.lng })
  } else {
    emit('preview', null)
  }
}

defineExpose({ selectTab })

// Spots already loaded for each station, so switching back to a tab doesn't call Google again
// (key: station name)
const cache = new Map()

const MAX_SPOTS = 6
const spots = ref([])
const moreCount = ref(0) // how many more there are than the cards shown
const loading = ref(false)
const error = ref('')

// "Chill · Food" for the heading
const vibeText = computed(() => {
  const names = []
  for (const vibe of props.vibes) {
    names.push(vibe.charAt(0).toUpperCase() + vibe.slice(1))
  }
  return names.join(' · ')
})

// Part (a) Load the spots near the selected station (or use the remembered ones)
async function loadSpots() {
  if (!googlePlacesEnabled.value || !station.value) {
    return
  }
  const name = station.value.name
  if (cache.has(name)) {
    showSpots(cache.get(name))
    return
  }
  loading.value = true
  error.value = ''
  try {
    const found = await searchNearby(
      { lat: station.value.lat, lng: station.value.lng },
      { radiusM: 800, categories: categoriesForVibes(props.vibes) },
    )
    cache.set(name, found)
    // only show it if this tab is still the open one (you might have tapped another meanwhile)
    if (station.value.name === name) {
      showSpots(found)
    }
  } catch (err) {
    console.error(err)
    error.value = 'Couldn’t load spots nearby. Try again later.'
  }
  loading.value = false
}

function showSpots(found) {
  spots.value = found.slice(0, MAX_SPOTS) // nearest first
  moreCount.value = Math.max(0, found.length - MAX_SPOTS)
}

onMounted(loadSpots)
watch(googlePlacesEnabled, loadSpots) // switched on with the switch below: load straight away
watch(() => station.value && station.value.name, loadSpots) // another tab opened

// Part (b) What each card shows
// About 80 m a minute when walking: 240 m → "3 min walk"
function walkLabel(spot) {
  const mins = Math.max(1, Math.round(spot.distance_m / 80))
  return `${mins} min walk`
}

// 0 → "Free", 2 → "$$"
function priceLabel(spot) {
  if (spot.price_level == null) {
    return ''
  }
  if (spot.price_level === 0) {
    return 'Free'
  }
  return '$'.repeat(spot.price_level)
}
</script>

<template>
  <section class="card">
    <div class="card-body">
      <div class="d-flex flex-wrap justify-content-between align-items-baseline gap-2 mb-2">
        <h2 class="h6 fw-bold mb-0">Things to do near {{ station.name }}</h2>
        <span v-if="vibeText" class="small text-secondary">Matches your vibe: {{ vibeText }}</span>
      </div>

      <!-- Station tabs: the midpoint first, then the next best stations. Tapping only previews. -->
      <div v-if="stations.length > 1" class="tabs" role="tablist" aria-label="Nearby MRT stations">
        <button
          v-for="t in stations"
          :key="t.name"
          type="button"
          role="tab"
          class="tab"
          :class="{ 'tab--on': t.name === station.name }"
          :aria-selected="t.name === station.name"
          @click="selectTab(t.name)"
        >
          <span v-if="t.chosen" aria-hidden="true">📍</span> {{ t.name }}
          <span v-if="t.chosen" class="tab-note">your midpoint</span>
          <span v-else-if="t.tag" class="tab-note">{{ t.tag }}</span>
        </button>
      </div>

      <!-- Previewing another station: the trade-off, and the button to switch -->
      <div v-if="!station.chosen" class="preview-bar">
        <span class="small"
          >{{ station.compareText }}
          <span class="text-secondary">(shown on the map below)</span></span
        >
        <button
          type="button"
          class="btn btn-primary btn-sm make-btn"
          :disabled="busy"
          @click="emit('choose', station.station)"
        >
          Make {{ station.name }} our midpoint
        </button>
      </div>

      <!-- Google Places is off: say why, with the switch right here -->
      <div v-if="!googlePlacesEnabled" class="off-box">
        <p class="small text-secondary mb-2">
          Switch on nearby spots to see cafes, food and activities around {{ station.name }}. (It's
          off by default because Google limits free searches.)
        </p>
        <GooglePlacesToggle />
      </div>

      <div
        v-else-if="loading"
        class="row row-cols-2 row-cols-md-3 row-cols-xl-6 g-3"
        aria-busy="true"
      >
        <div v-for="n in 3" :key="n" class="col">
          <div class="placeholder-glow">
            <span class="placeholder col-12 rounded" style="height: 150px"></span>
          </div>
        </div>
      </div>

      <p v-else-if="error" class="small text-danger mb-0" role="alert">{{ error }}</p>

      <p v-else-if="spots.length === 0" class="small text-secondary mb-0">
        No spots matching your vibe within 800 m. Try “See other stations”.
      </p>

      <template v-else>
        <ul class="spot-list row row-cols-2 row-cols-md-3 row-cols-xl-6 g-3 list-unstyled mb-0">
          <li v-for="s in spots" :key="s.source_place_id" class="col">
            <!-- the whole card opens the spot's page (10) -->
            <RouterLink
              class="spot"
              :to="{ name: 'spot-details', params: { id: hangoutId, spotId: s.source_place_id } }"
            >
              <img v-if="s.image_url" :src="s.image_url" alt="" class="spot__img" loading="lazy" />
              <div v-else class="spot__img spot__img--empty" aria-hidden="true">
                {{ CATEGORY_EMOJI[s.category] || '📍' }}
              </div>
              <div class="spot__body">
                <div class="spot__name">
                  <span aria-hidden="true">{{ CATEGORY_EMOJI[s.category] || '📍' }}</span>
                  {{ s.name }}
                </div>
                <div class="spot__meta">
                  <span v-if="s.rating">⭐ {{ s.rating.toFixed(1) }}</span>
                  <span v-if="priceLabel(s)">{{ priceLabel(s) }}</span>
                  <span>🚶 {{ walkLabel(s) }}</span>
                </div>
                <span v-if="s.open_now" class="open-tag">Open now</span>
              </div>
            </RouterLink>
          </li>
        </ul>
        <div class="d-flex justify-content-between align-items-center mt-3">
          <span v-if="moreCount > 0" class="small text-secondary"
            >+{{ moreCount }} more nearby</span
          >
          <RouterLink class="see-all ms-auto" :to="{ name: 'explore', params: { id: hangoutId } }">
            See all spots →
          </RouterLink>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: 0.5rem;
  margin: 0 0 0.75rem;
  padding-bottom: 0.25rem;
  overflow-x: auto; /* on phones the tabs scroll sideways inside this row, not the page */
}

.tab {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 44px;
  padding: 0.35rem 0.9rem;
  border: 1px solid var(--fp-border);
  border-radius: 999px;
  background: var(--fp-surface);
  color: var(--fp-ink);
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
}

.tab:hover {
  border-color: var(--fp-primary);
}

.tab--on {
  border-color: var(--fp-primary);
  background: color-mix(in srgb, var(--fp-primary) 12%, var(--fp-surface));
}

.tab-note {
  color: var(--fp-muted);
  font-size: 0.75rem;
  font-weight: 500;
}

.preview-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 1rem;
  margin-bottom: 0.75rem;
  padding: 0.6rem 0.85rem;
  border-radius: var(--fp-radius-sm);
  background: color-mix(in srgb, var(--fp-accent) 10%, var(--fp-surface));
}

.make-btn {
  min-height: 44px;
  font-weight: 600;
}

.off-box {
  padding: 0.85rem 1rem;
  border-radius: var(--fp-radius-sm);
  background: var(--fp-bg);
}

.spot {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius-sm);
  background: var(--fp-surface);
  color: var(--fp-ink);
  text-decoration: none;
  transition:
    transform 0.25s,
    box-shadow 0.25s,
    opacity 0.25s;
}

/* like the dashboard cards: the spot under the pointer rises and the others fade */
@media (hover: hover) {
  .spot-list:hover .spot {
    opacity: 0.45;
  }
  .spot-list .spot:hover {
    opacity: 1;
    transform: translateY(-4px);
    box-shadow: var(--fp-shadow-lift);
  }
}

.spot__img {
  width: 100%;
  height: 96px;
  object-fit: cover;
}

.spot__img--empty {
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--fp-primary) 8%, var(--fp-surface));
  font-size: 2rem;
}

.spot__body {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.6rem 0.7rem 0.75rem;
  min-width: 0;
}

.spot__name {
  display: -webkit-box;
  overflow: hidden;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.3;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2; /* at most 2 lines, then "…" */
  overflow-wrap: anywhere;
}

.spot__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.15rem 0.6rem;
  color: var(--fp-muted);
  font-size: 0.75rem;
}

.open-tag {
  align-self: flex-start;
  padding: 0.05rem 0.45rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--fp-primary) 12%, var(--fp-surface));
  color: var(--fp-primary-dark);
  font-size: 0.7rem;
  font-weight: 600;
}

.see-all {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  font-weight: 600;
  text-decoration: none;
}
</style>
