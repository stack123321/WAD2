<script setup>
// Owner: Ryan
// "crowds right now" card on 04 dashboard: how many mrt stations are busy now, plus a link to /crowds
import { ref, computed, onMounted } from 'vue'
import { getCrowdLevels } from '@/services/crowd'

const stations = ref([])
const loading = ref(false)
const error = ref('')

// how many stations are at each level e.g. { h: 12, m: 30, l: 148 }
const counts = computed(() => {
  let result = { h: 0, m: 0, l: 0 }
  for (let s of stations.value) {
    result[s.level]++
  }
  return result
})

// true when lta unavailable and api/crowd.js sent sample data 
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
      <h2 class="h6 mb-3">Crowds right now</h2>

      <p v-if="loading" class="text-muted small mb-3">Loading crowd levels…</p>
      <p v-else-if="error" class="text-danger small mb-3">{{ error }}</p>
      <template v-else>
        <p v-if="isSample" class="text-muted small mb-2">
          LTA is unavailable, so these are sample crowd levels.
        </p>
        <p class="small text-muted mb-2">MRT stations across Singapore:</p>
        <div class="d-flex flex-wrap gap-2 mb-3">
          <span class="badge text-bg-danger">{{ counts.h }} busy</span>
          <span class="badge text-bg-warning">{{ counts.m }} moderate</span>
          <span class="badge text-bg-success">{{ counts.l }} quiet</span>
        </div>
      </template>

      <router-link :to="{ name: 'crowds' }" class="btn btn-outline-primary btn-sm w-100">
        Open heat map →
      </router-link>
    </div>
  </div>
</template>
