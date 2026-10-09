<script setup>
// 04 My hangouts
// Owner: Ryan · Vet by: Eashvar
import { ref, computed, onMounted } from 'vue'
import { getMyHangouts } from '@/services/hangouts'
import HangoutCard from '@/components/dashboard/HangoutCard.vue'
import CrowdsNow from '@/components/heatmap/CrowdsNow.vue'

const hangouts = ref([])
const loading = ref(false)
const error = ref('')
const tab = ref('upcoming') // which list is showing: 'upcoming' or 'past'

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
})

const upcoming = computed(() => hangouts.value.filter((h) => h.status !== 'done'))
const past = computed(() => hangouts.value.filter((h) => h.status === 'done'))
const shown = computed(() => (tab.value === 'upcoming' ? upcoming.value : past.value))

// "Heat map →" opens page 08 of the next hangout, if there is one
const heatMapLink = computed(() => {
  if (upcoming.value.length === 0) return null
  return { name: 'midpoint', params: { id: upcoming.value[0].id } }
})

onMounted(async () => {
  loading.value = true
  try {
    hangouts.value = await getMyHangouts()
  } catch (err) {
    console.log(err)
    error.value = 'Could not load your hangouts.'
  }
  loading.value = false
})
</script>

<template>
  <main class="container py-4">
    <div class="row g-4">
      <div class="col-lg-8">
        <h1 class="h2 mb-1">{{ greeting }}!</h1>
        <p class="text-muted">
          You have {{ upcoming.length }} {{ upcoming.length === 1 ? 'hangout' : 'hangouts' }} in
          progress.
        </p>

        <section
          class="plan-banner d-flex flex-wrap align-items-center justify-content-between gap-3 p-4 mb-4"
        >
          <div>
            <h2 class="h4 mb-1">Plan a new hangout</h2>
            <p class="mb-0">Invite friends, find a fair midpoint and vote on what to do.</p>
          </div>
          <router-link :to="{ name: 'create-hangout' }" class="btn btn-light fw-semibold">
            Start planning
          </router-link>
        </section>

        <div class="d-flex justify-content-between align-items-center mb-3">
          <h2 class="h5 mb-0">Your hangouts</h2>
          <div class="btn-group" role="group" aria-label="Show upcoming or past hangouts">
            <button
              type="button"
              class="btn btn-sm"
              :class="tab === 'upcoming' ? 'btn-primary' : 'btn-outline-primary'"
              @click="tab = 'upcoming'"
            >
              Upcoming
            </button>
            <button
              type="button"
              class="btn btn-sm"
              :class="tab === 'past' ? 'btn-primary' : 'btn-outline-primary'"
              @click="tab = 'past'"
            >
              Past
            </button>
          </div>
        </div>

        <p v-if="loading" class="text-muted">Loading your hangouts…</p>
        <p v-else-if="error" class="text-danger">{{ error }}</p>
        <p v-else-if="shown.length === 0" class="text-muted">
          {{
            tab === 'upcoming'
              ? 'No hangouts yet. Start planning one above!'
              : 'No past hangouts yet.'
          }}
        </p>

        <div v-for="h in shown" :key="h.id" class="mb-3">
          <HangoutCard :hangout="h" />
        </div>
      </div>

      <div class="col-lg-4 d-flex flex-column gap-4">
        <!-- Surya: "Weather this week" card goes here (getDayForecast() in services/weather.js) -->
        <CrowdsNow :heat-map-link="heatMapLink" />
      </div>
    </div>
  </main>
</template>

<style scoped>
.plan-banner {
  background: var(--fp-primary-dark);
  color: var(--fp-surface);
  border-radius: var(--fp-radius);
}
</style>
