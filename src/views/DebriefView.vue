<script setup>
// Debrief (after 12 Final plan)
// Owner: Eashvar
// A look back at a hangout that's over: where the group went and when, who came, everyone's
// photos, how the spot was chosen (the final vote and one line on how it was settled), the
// runner-up, and how fair the trips were (Fair for everyone, the short version of 12's).
// (Design catalogue A1) The band says what happened in one line; photos lead, as the reason to
// come back, with how you decided under them; the spot, who came, fairness and What next on the right. "Plan another with this group" opens 05 New hangout
// with everyone else already ticked. Opened from past hangouts on 04 and from 12 once it's marked
// done. A hangout that hasn't been decided yet gets a short note and a link to its plan instead.
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useHangoutStore } from '@/stores/hangout'
import { useAuthStore } from '@/stores/auth'
import { isMockHangout } from '@/services/votes'
import SpotHero from '@/components/voting/SpotHero.vue'
import TripTable from '@/components/voting/TripTable.vue'
import VoteResults from '@/components/voting/VoteResults.vue'
import MemberAvatar from '@/components/voting/MemberAvatar.vue'
import HangoutPhotos from '@/components/debrief/HangoutPhotos.vue'
import PageBand from '@/components/ui/PageBand.vue'
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

// "Friday dinner after class · Brew & Board Café, Bishan · Fri, 16 Oct, 7:00 pm"
const bandLead = computed(() => {
  if (!hangout.value) return ''
  const parts = [hangout.value.name]
  if (spot.value) {
    const area = hangout.value.midpoint_name
    parts.push(area ? `${spot.value.name}, ${area}` : spot.value.name)
  }
  if (startsAt.value) parts.push(formatDateTime(startsAt.value))
  return parts.join(' · ')
})

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

// "Ryan (you), Nicole, Surya and Hugo"
const whoCame = computed(() => {
  const names = store.members.map((m) =>
    m.user_id === myId.value ? `${m.display_name} (you)` : m.display_name,
  )
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0]
})

// Everyone except me, ticked on 05 New hangout
const planAgainLink = computed(() => ({
  name: 'create-hangout',
  query: { with: store.members.map((m) => m.user_id).filter((id) => id !== myId.value) },
}))

// (Surya) the host can remove anyone's photos
const isHost = computed(() => Boolean(myId.value) && hangout.value?.host_id === myId.value)

// (Surya) Same group, same place, same starting points: you only pick a new date on 05
const goAgainLink = computed(() => ({
  name: 'create-hangout',
  query: { ...planAgainLink.value.query, again: hangoutId },
}))

onMounted(() => store.load(hangoutId))
</script>

<template>
  <main>
    <PageBand
      title="How it went"
      :lead="bandLead"
      :back="{ to: { name: 'dashboard' }, label: 'My hangouts' }"
    >
      <template v-if="hangout && spot" #actions>
        <span class="done-tag">{{ status === 'done' ? 'Done' : 'Not marked as done yet' }}</span>
      </template>
    </PageBand>

    <div class="container fp-pull">
      <div v-if="store.loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading the debrief…</span>
        </div>
      </div>

      <div v-else-if="store.error" class="alert alert-danger" role="alert">
        Couldn't load this hangout. {{ store.error.message }}
      </div>

      <template v-else-if="hangout && !spot">
        <div class="alert alert-info">
          This hangout hasn't been decided yet, so there's nothing to look back on.
          <RouterLink :to="{ name: 'final-plan', params: { id: hangoutId } }"
            >See the plan</RouterLink
          >
        </div>
      </template>

      <template v-else-if="hangout">
        <div class="debrief-layout">
          <div class="debrief-col">
            <!-- (Surya) everyone's photos from the day -->
            <HangoutPhotos
              class="slot-photos"
              :hangout-id="hangoutId"
              :my-id="myId"
              :is-host="isHost"
            />

            <section class="panel slot-vote" aria-labelledby="vote-heading">
              <h2 id="vote-heading" class="panel-title mb-1">How you decided</h2>
              <p v-if="decision" class="small muted mb-3">{{ decision }}</p>
              <VoteResults :rows="rows" :voters-by-spot="votersBySpot" :final-id="spot.id" />
              <p v-if="backup" class="small muted mt-3 mb-0">
                Runner-up: <strong>{{ backup.name }}</strong>
              </p>
            </section>
          </div>

          <div class="debrief-col">
            <SpotHero
              class="slot-hero"
              heading-id="where-heading"
              :spot="spot"
              label="Where you went"
              :area="hangout.midpoint_name"
            />

            <section class="panel slot-who" aria-labelledby="who-heading">
              <h2 id="who-heading" class="panel-title mb-3">
                Who came ({{ store.members.length }})
              </h2>
              <div class="d-flex align-items-center gap-3">
                <ul class="avatars list-unstyled mb-0" aria-hidden="true">
                  <li v-for="m in store.members" :key="m.user_id">
                    <MemberAvatar :name="m.display_name" :color="m.avatar_color" :size="40" />
                  </li>
                </ul>
                <p class="mb-0">{{ whoCame }}</p>
              </div>
            </section>

            <TripTable
              class="slot-fair"
              :members="store.members"
              :starts-at="startsAt"
              :my-id="myId"
              past
            />
            <section class="panel panel--deep slot-next" aria-labelledby="next-heading">
              <h2 id="next-heading" class="panel-title mb-3">What next</h2>
              <div class="d-grid gap-2">
                <!-- (Surya) skips straight to the plan, with everything copied from this time -->
                <RouterLink v-if="spot" class="btn btn-accent" :to="goAgainLink">
                  ↻ Go again to {{ spot.name }}
                </RouterLink>
                <RouterLink
                  class="btn"
                  :class="spot ? 'btn-on-deep' : 'btn-accent'"
                  :to="planAgainLink"
                >
                  Plan another with this group
                </RouterLink>
                <RouterLink
                  class="btn btn-on-deep"
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
    </div>
  </main>
</template>

<style scoped>
/* What next, on the deep teal */
.panel.panel--deep {
  background: var(--fp-deep);
  border-color: var(--fp-deep);
  color: #fff;
}

.done-tag {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 1rem;
  border-radius: 999px;
  background: var(--fp-accent);
  color: var(--fp-deep);
  font-weight: 800;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: 44px;
}

/* Phones: one column, cards in the order below (the columns step aside with display: contents).
   From lg: the spot, photos and trips on the left; who came, the vote and what next on the right. */
.debrief-layout {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.debrief-col {
  display: contents;
}

.slot-hero {
  order: 2;
}

.slot-who {
  order: 3;
}

.slot-photos {
  order: 1;
}

.slot-vote {
  order: 4;
}

.slot-fair {
  order: 5;
}

.slot-next {
  order: 6;
}

@media (min-width: 992px) {
  .debrief-layout {
    display: grid;
    grid-template-columns: 7fr 5fr;
    align-items: start;
  }

  .debrief-col {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
}

.panel {
  background: var(--fp-surface);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
  box-shadow: var(--fp-shadow);
  padding: 1.25rem;
}

.panel-title {
  font-size: 1rem;
  font-weight: 700;
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

/* overlapping circles, like the group in the step bar */
.avatars {
  display: flex;
  flex: none;
}

.avatars li {
  display: flex;
  border-radius: 50%;
  box-shadow: 0 0 0 2px var(--fp-surface);
}

.avatars li + li {
  margin-left: -0.6rem;
}
</style>
