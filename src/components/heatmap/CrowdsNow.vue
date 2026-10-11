<script setup>
// "Crowds right now" card on 04 Dashboard: the 4 busiest MRT stations at the moment.
// Owner: Ryan. Data: services/crowd.js → api/crowd.js → LTA DataMall.
import { ref, computed, onMounted } from 'vue'
import { getCrowdLevels } from '@/services/crowd'

const props = defineProps({
  heatMapLink: { type: Object, default: null }, // where "Heat map →" goes, e.g. a hangout's page 08
})

// How each LTA level looks: label, bar colour, bar length, text colour
const LEVELS = {
  h: { name: 'Busy', bar: 'bg-danger', width: 90, text: 'text-danger' },
  m: { name: 'Moderate', bar: 'bg-warning', width: 55, text: 'text-warning' },
  l: { name: 'Quiet', bar: 'bg-success', width: 20, text: 'text-success' },
}

const stations = ref([])
const loading = ref(false)
const error = ref('')

const shownCount = ref(4) // how many stations the card lists; "Show more" adds 6

// Busiest first: all the high ones, then moderate, then low, stopping at shownCount
const busiest = computed(() => {
  let list = []
  for (let level of ['h', 'm', 'l']) {
    for (let s of stations.value) {
      if (s.level === level && list.length < shownCount.value) list.push(s)
    }
  }
  return list
})

// True when LTA was unavailable and api/crowd.js sent sample data instead
const isSample = computed(
  () => stations.value.length > 0 && stations.value[0].station.includes('(sample)'),
)

onMounted(async () => {
  loading.value = true
  try {
    stations.value = await getCrowdLevels(new Date())
  } catch (err) {
    console.log(err)
    error.value = 'Could not load crowd levels.'
  }
  loading.value = false
})
</script>

<template>
  <div class="card">
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h2 class="h6 mb-0">Crowds right now</h2>
        <router-link v-if="props.heatMapLink" :to="props.heatMapLink" class="small fw-semibold">
          Heat map →
        </router-link>
      </div>

      <p v-if="loading" class="text-muted small mb-0">Loading crowd levels…</p>
      <p v-else-if="error" class="text-danger small mb-0">{{ error }}</p>
      <p v-else-if="isSample" class="text-muted small mb-3">
        LTA is unavailable, so these are sample crowd levels.
      </p>

      <div v-for="s in busiest" :key="s.station" class="mb-3">
        <div class="d-flex justify-content-between small mb-1">
          <span>{{ s.station }}</span>
          <span class="fw-semibold" :class="LEVELS[s.level].text">{{ LEVELS[s.level].name }}</span>
        </div>
        <div class="progress" :aria-label="`${s.station}: ${LEVELS[s.level].name}`">
          <div
            class="progress-bar"
            :class="LEVELS[s.level].bar"
            :style="{ width: LEVELS[s.level].width + '%' }"
          ></div>
        </div>
      </div>

      <div v-if="stations.length > 4" class="d-flex gap-3">
        <button
          v-if="shownCount < stations.length"
          type="button"
          class="btn btn-link btn-sm p-0"
          @click="shownCount += 6"
        >
          Show more
        </button>
        <button
          v-if="shownCount > 4"
          type="button"
          class="btn btn-link btn-sm p-0"
          @click="shownCount = 4"
        >
          Show less
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.progress {
  height: 6px;
}
</style>
