<script setup>
// Debrief (after 12 Final plan)
// Owner: Eashvar
// A look back at a hangout that's over: where the group went and when, who came, how fair the
// trips were (Fair for everyone, same as 12), how the spot was chosen (the final vote and one line
// on how it was settled), and the runner-up. "Plan another with this group" opens 05 New hangout
// with everyone else already ticked. Opened from past hangouts on 04 and from 12 once it's marked
// done. A hangout that hasn't been decided yet gets a short note and a link to its plan instead.
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useHangoutStore } from '@/stores/hangout'
import { useAuthStore } from '@/stores/auth'
import { isMockHangout } from '@/services/votes'
import TripTable from '@/components/voting/TripTable.vue'
import VoteResults from '@/components/voting/VoteResults.vue'
import MemberAvatar from '@/components/voting/MemberAvatar.vue'
import {
  countableVotes,
  countVotes,
  decisionSummary,
  formatDateTime,
  runnerUp,
} from '@/components/voting/voteHelpers'

const route = useRoute()
const store = useHangoutStore()
const auth = useAuthStore()

const hangoutId = route.params.id
const isMock = isMockHangout(hangoutId)

const hangout = computed(() => store.hangout)
const status = computed(() => hangout.value?.status)
const startsAt = computed(() => hangout.value?.starts_at ?? null)
const myId = computed(() => auth.user?.id ?? (isMock ? (hangout.value?.host_id ?? null) : null))

const votes = computed(() => countableVotes(store.votes, store.members))
const rows = computed(() => countVotes(store.shortlist, votes.value))
const spot = computed(
  () => store.shortlist.find((s) => s.id === hangout.value?.final_shortlist_id) ?? null,
)
const backup = computed(() =>
  spot.value ? (runnerUp(rows.value, spot.value.id)?.spot ?? null) : null,
)
const decision = computed(() => decisionSummary(rows.value, spot.value?.id))

// who voted for what, with their name and colour, for the vote results
const votersBySpot = computed(() => {
  const result = {}
  for (const v of votes.value) {
    const member = store.members.find((m) => m.user_id === v.user_id)
    const voter = {
      userId: v.user_id,
      name: member?.display_name ?? 'Someone',
      color: member?.avatar_color ?? null,
    }
    result[v.shortlist_id] = [...(result[v.shortlist_id] ?? []), voter]
  }
  return result
})

// Everyone except me, ticked on 05 New hangout
const planAgainLink = computed(() => ({
  name: 'create-hangout',
  query: { with: store.members.map((m) => m.user_id).filter((id) => id !== myId.value) },
}))

onMounted(() => store.load(hangoutId))
</script>

<template>
  <main class="container py-4">
    <div v-if="store.loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading the debrief…</span>
      </div>
    </div>

    <div v-else-if="store.error" class="alert alert-danger" role="alert">
      Couldn't load this hangout. {{ store.error.message }}
    </div>

    <template v-else-if="hangout && !spot">
      <h1 class="h2 mb-2">How it went</h1>
      <div class="alert alert-info">
        This hangout hasn't been decided yet, so there's nothing to look back on.
        <RouterLink :to="{ name: 'final-plan', params: { id: hangoutId } }"
          >See the plan</RouterLink
        >
      </div>
    </template>

    <template v-else-if="hangout">
      <header class="mb-4">
        <p class="label small mb-1">{{ status === 'done' ? 'Done' : 'Not marked as done yet' }}</p>
        <h1 class="h2 mb-1">How it went</h1>
        <p class="muted mb-0">{{ hangout.name }}</p>
      </header>

      <div class="row g-4">
        <div class="col-12 col-lg-7 d-flex flex-column gap-4">
          <section class="panel hero" aria-labelledby="where-heading">
            <h2 id="where-heading" class="h4 mb-1">{{ spot.name }}</h2>
            <p class="muted mb-2">
              <span class="text-capitalize">{{ spot.category }}</span>
              <template v-if="hangout.midpoint_name"> · {{ hangout.midpoint_name }}</template>
            </p>
            <p v-if="startsAt" class="mb-0">
              <strong>{{ formatDateTime(startsAt) }}</strong> SGT
            </p>
          </section>

          <TripTable :members="store.members" :starts-at="startsAt" :my-id="myId" />
        </div>

        <div class="col-12 col-lg-5 d-flex flex-column gap-4">
          <section class="panel" aria-labelledby="who-heading">
            <h2 id="who-heading" class="h6 mb-3">Who came ({{ store.members.length }})</h2>
            <ul class="list-unstyled d-flex flex-wrap gap-3 mb-0">
              <li
                v-for="m in store.members"
                :key="m.user_id"
                class="d-flex align-items-center gap-2"
              >
                <MemberAvatar :name="m.display_name" :color="m.avatar_color" :size="32" />
                <span
                  >{{ m.display_name }}<template v-if="m.user_id === myId"> (you)</template></span
                >
              </li>
            </ul>
          </section>

          <section class="panel" aria-labelledby="vote-heading">
            <h2 id="vote-heading" class="h6 mb-1">How you decided</h2>
            <p v-if="decision" class="small muted mb-3">{{ decision }}</p>
            <VoteResults :rows="rows" :voters-by-spot="votersBySpot" :final-id="spot.id" />
            <p v-if="backup" class="small muted mt-3 mb-0">
              Runner-up: <strong>{{ backup.name }}</strong>
            </p>
          </section>

          <section class="panel" aria-labelledby="next-heading">
            <h2 id="next-heading" class="h6 mb-3">What next</h2>
            <div class="d-grid gap-2">
              <RouterLink class="btn btn-primary" :to="planAgainLink">
                Plan another with this group
              </RouterLink>
              <RouterLink
                class="btn btn-outline-primary"
                :to="{ name: 'final-plan', params: { id: hangoutId } }"
              >
                See the final plan
              </RouterLink>
            </div>
          </section>
        </div>
      </div>

      <nav class="mt-4" aria-label="Back">
        <RouterLink class="btn btn-link px-0" :to="{ name: 'dashboard' }">
          Back to my hangouts
        </RouterLink>
      </nav>
    </template>
  </main>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: 44px;
}

.panel {
  background: var(--fp-surface);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
  box-shadow: var(--fp-shadow);
  padding: 1.25rem;
}

.hero {
  border-top: 4px solid var(--fp-primary);
}

.label {
  color: var(--fp-primary);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.muted {
  color: var(--fp-muted);
}
</style>
