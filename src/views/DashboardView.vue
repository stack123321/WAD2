<script setup>
// 04 My hangouts
// Owner: Ryan · Vet by: Eashvar
import { ref, computed, onMounted } from 'vue'
import { deleteHangout, getMyHangouts, leaveHangout } from '@/services/hangouts'
import { useAuthStore } from '@/stores/auth'
import HangoutCard from '@/components/dashboard/HangoutCard.vue'
import CrowdsNow from '@/components/heatmap/CrowdsNow.vue'
import WeekForecast from '@/components/weather/WeekForecast.vue'

const hangouts = ref([])
const loading = ref(false)
const error = ref('')
const tab = ref('upcoming') // which list is showing: 'upcoming' or 'past'
const auth = useAuthStore()

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
})

// The name they typed at sign up, or '' when nobody is logged in (or they used Google)
const name = computed(() => {
  if (!auth.user) return ''
  return auth.user.user_metadata.display_name || ''
})

// "Good evening, Ryan!" or just "Good evening!" when we don't know the name
const heading = computed(() =>
  name.value ? `${greeting.value}, ${name.value}!` : `${greeting.value}!`,
)

const upcoming = computed(() => hangouts.value.filter((h) => h.status !== 'done'))
const past = computed(() => hangouts.value.filter((h) => h.status === 'done'))
const shown = computed(() => (tab.value === 'upcoming' ? upcoming.value : past.value))

// Deleting (host) or leaving (other members) a hangout
const deleteError = ref('')

function isHost(hangout) {
  return auth.user !== null && hangout.host_id === auth.user.id
}

// Logged in, in the hangout, but not the host
function isMember(hangout) {
  return auth.user !== null && !isHost(hangout)
}

async function onLeave(hangout) {
  deleteError.value = ''
  const sure = window.confirm(
    `Leave "${hangout.name}"? Your starting point and vote will be removed. You can rejoin with the invite link.`,
  )
  if (!sure) {
    return
  }
  try {
    await leaveHangout(hangout.id, auth.user.id)
    hangouts.value = hangouts.value.filter((h) => h.id !== hangout.id)
  } catch (err) {
    console.error(err)
    deleteError.value = `Couldn't leave "${hangout.name}": ${err.message}`
  }
}

async function onDelete(hangout) {
  deleteError.value = ''
  const sure = window.confirm(
    `Delete "${hangout.name}"? Everyone's starting points and votes for it will be deleted too. This can't be undone.`,
  )
  if (!sure) {
    return
  }
  try {
    await deleteHangout(hangout.id)
    hangouts.value = hangouts.value.filter((h) => h.id !== hangout.id)
  } catch (err) {
    console.error(err)
    deleteError.value = `Couldn't delete "${hangout.name}": ${err.message}`
  }
}

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
        <h1 class="h2 mb-1">{{ heading }}</h1>
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

        <p v-if="deleteError" class="text-danger" role="alert">{{ deleteError }}</p>

        <div v-for="h in shown" :key="h.id" class="mb-3">
          <HangoutCard
            :hangout="h"
            :can-delete="isHost(h)"
            :can-leave="isMember(h)"
            @delete="onDelete"
            @leave="onLeave"
          />
        </div>
      </div>

      <div class="col-lg-4 d-flex flex-column gap-4">
        <WeekForecast />
        <CrowdsNow />
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
