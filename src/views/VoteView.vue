<script setup>
// 11 Group voting
// Owner: Eashvar · Vet by: Ryan
// Figma frame "11". Everyone votes for one shortlisted spot; the tally updates live
// (Supabase Realtime) and the host closes the vote, which leads to 12 Final plan.
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHangoutStore } from '@/stores/hangout'
import { useAuthStore } from '@/stores/auth'
import { castVote, closeVote, getVotes, isMockHangout, subscribeToVotes } from '@/services/votes'
import CandidateList from '@/components/voting/CandidateList.vue'
import VoteTally from '@/components/voting/VoteTally.vue'
import ClosePanel from '@/components/voting/ClosePanel.vue'
import ActivityFeed from '@/components/voting/ActivityFeed.vue'
import {
  countVotes,
  diffVotes,
  formatDateTime,
  isTied,
  pickLeader,
  timeLeft,
} from '@/components/voting/voteHelpers'

const route = useRoute()
const router = useRouter()
const store = useHangoutStore()
const auth = useAuthStore()

const hangoutId = route.params.id
const isMock = isMockHangout(hangoutId)

// Page-only state
const votes = ref([]) // this page's copy of the votes; the tally is worked out from it
const history = ref([]) // activity seen while the page is open (the database keeps only the latest vote)
const now = ref(Date.now()) // ticks every 30 s so the countdown stays current
const pickedWinnerId = ref(null) // the host's choice in the "Winner" box, null = follow the leader
const actionError = ref('')
const closing = ref(false)

let nextEventId = 1
let unsubscribe = () => {}
let timer = null

const hangout = computed(() => store.hangout)

// Who "me" is. In demo mode nobody is logged in, so we fall back to the hangout's host
// (Ryan in the mock). That lets the host-only controls be tried without keys.
// With real data we never guess: no logged-in user means no voting.
const myId = computed(() => auth.user?.id ?? (isMock ? (hangout.value?.host_id ?? null) : null))
const isHost = computed(() => myId.value !== null && myId.value === hangout.value?.host_id)
const myVoteId = computed(
  () => votes.value.find((v) => v.user_id === myId.value)?.shortlist_id ?? null,
)

// Tally
const rows = computed(() => countVotes(store.shortlist, votes.value))
const counts = computed(() => {
  const result = {}
  for (const row of rows.value) result[row.spot.id] = row.count
  return result
})
const leader = computed(() => pickLeader(rows.value))
const leaderId = computed(() => (leader.value?.count > 0 ? leader.value.spot.id : null))
const tied = computed(() => isTied(rows.value))
const memberStatus = computed(() =>
  store.members.map((m) => ({
    userId: m.user_id,
    name: m.user_id === myId.value ? `${m.display_name} (you)` : m.display_name,
    hasVoted: votes.value.some((v) => v.user_id === m.user_id),
  })),
)
const winnerId = computed(() => pickedWinnerId.value ?? leader.value?.spot.id ?? null)

// Deadline
const deadline = computed(() => hangout.value?.vote_deadline ?? null)
const timeLeftText = computed(() => (deadline.value ? timeLeft(deadline.value, now.value) : null))
const deadlinePassed = computed(() => deadline.value !== null && timeLeftText.value === null)
const status = computed(() => hangout.value?.status)
const votingOpen = computed(() => status.value === 'voting' && !deadlinePassed.value)
const canVote = computed(() => votingOpen.value && myId.value !== null)

// Activity feed, newest first, with user and spot ids turned into names
function nameOf(userId) {
  if (userId === myId.value) return 'You'
  return store.members.find((m) => m.user_id === userId)?.display_name ?? 'Someone'
}
function spotName(spotId) {
  return store.shortlist.find((s) => s.id === spotId)?.name ?? 'a removed spot'
}
const feedItems = computed(() =>
  // Event ids count up in the order this page saw them, so the highest id is the newest
  [...history.value]
    .sort((a, b) => b.id - a.id)
    .map((event) => ({
      id: event.id,
      kind: event.kind,
      isMe: event.userId === myId.value,
      name: nameOf(event.userId),
      toName: event.toId ? spotName(event.toId) : null,
      fromName: event.fromId ? spotName(event.fromId) : null,
      at: event.at,
    })),
)

/** Replace this page's votes, logging what changed in the activity feed. Returns the new events. */
function applyVotes(next) {
  // Oldest first before numbering, so the votes already in the database are numbered in time order
  const events = diffVotes(votes.value, next, new Date().toISOString())
    .sort((a, b) => new Date(a.at) - new Date(b.at))
    .map((event) => ({ ...event, id: nextEventId++ }))
  history.value.push(...events)
  votes.value = next
  return events
}

// Called on every Realtime change. We fetch all the votes again rather than reading the
// event itself: it's simpler, and delete events don't include the whole row.
async function refreshVotes() {
  try {
    applyVotes(await getVotes(hangoutId))
  } catch (e) {
    actionError.value = `Couldn't refresh the votes: ${e.message}`
  }
}

async function vote(spotId) {
  if (!canVote.value || spotId === myVoteId.value) return
  actionError.value = ''
  const before = votes.value
  const mine = { user_id: myId.value, shortlist_id: spotId, voted_at: new Date().toISOString() }
  // Update the tally straight away. In demo mode castVote does nothing, so this is the only update.
  const added = applyVotes([...before.filter((v) => v.user_id !== myId.value), mine])
  try {
    await castVote(hangoutId, myId.value, spotId)
  } catch (e) {
    // Undo the early update so the tally matches the database again
    votes.value = before
    history.value = history.value.filter((event) => !added.includes(event))
    actionError.value = `Your vote wasn't saved: ${e.message}`
  }
}

async function onClose(spotId) {
  closing.value = true
  actionError.value = ''
  try {
    await closeVote(hangoutId, spotId)
    // Update the store ourselves instead of load(id, { force: true }). A forced reload of the
    // demo hangout would bring back the original mock data and lose this session's votes and
    // winner. With real data the database already has these values, so no extra fetch is needed.
    store.hangout.status = 'confirmed'
    store.hangout.final_shortlist_id = spotId
    store.hangout.votes = votes.value
    router.push({ name: 'final-plan', params: { id: hangoutId } })
  } catch (e) {
    actionError.value = `Couldn't close the vote: ${e.message}`
  } finally {
    closing.value = false
  }
}

onMounted(async () => {
  // Subscribe first, so onUnmounted can always clean up even if loading fails
  unsubscribe = subscribeToVotes(hangoutId, refreshVotes)
  timer = setInterval(() => {
    now.value = Date.now()
  }, 30000)

  await store.load(hangoutId)
  if (store.error) return
  try {
    // Demo votes come from the mock. Real votes are fetched fresh, in case the store is old.
    const start = isMock ? store.votes.map((v) => ({ ...v })) : await getVotes(hangoutId)
    applyVotes(start) // starts the feed with one "voted" entry per vote
  } catch (e) {
    actionError.value = `Couldn't load the votes: ${e.message}`
  }
})

onUnmounted(() => {
  unsubscribe()
  clearInterval(timer)
})
</script>

<template>
  <main class="container py-4">
    <header class="mb-4">
      <p v-if="hangout" class="eyebrow mb-1">{{ hangout.name }}</p>
      <h1 class="h2 mb-2">Group voting</h1>
      <p v-if="hangout && deadline" class="small mb-0">
        <template v-if="votingOpen">
          Closes {{ formatDateTime(deadline) }} SGT ·
          <strong class="time-left">{{ timeLeftText }}</strong>
        </template>
        <template v-else>
          <span class="badge closed">Voting closed</span>
          <template v-if="status === 'voting'">
            The deadline ({{ formatDateTime(deadline) }} SGT) has passed.
          </template>
        </template>
      </p>
    </header>

    <div v-if="store.loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading the vote…</span>
      </div>
    </div>

    <div v-else-if="store.error" class="alert alert-danger" role="alert">
      Couldn't load this hangout. {{ store.error.message }}
    </div>

    <template v-else-if="hangout">
      <div v-if="actionError" class="alert alert-danger" role="alert">{{ actionError }}</div>

      <div v-if="status === 'collecting'" class="alert alert-info">
        Voting hasn't opened yet. The group is still adding starting points.
      </div>
      <div v-else-if="status === 'confirmed' || status === 'done'" class="alert alert-info">
        The host has closed the vote.
        <RouterLink :to="{ name: 'final-plan', params: { id: hangoutId } }">
          See the final plan
        </RouterLink>
      </div>
      <div v-else-if="!myId" class="alert alert-warning">Log in to vote.</div>

      <div class="row g-4">
        <section class="col-12 col-lg-7" aria-labelledby="candidates-heading">
          <h2 id="candidates-heading" class="h5 mb-1">Pick one spot</h2>
          <p class="small muted mb-3">
            Everyone gets one vote, and you can change yours until voting closes.
          </p>
          <CandidateList
            :shortlist="store.shortlist"
            :counts="counts"
            :my-vote-id="myVoteId"
            :disabled="!canVote"
            @vote="vote"
          />
        </section>

        <div class="col-12 col-lg-5 d-flex flex-column gap-4">
          <VoteTally
            :rows="rows"
            :leader-id="leaderId"
            :tied="tied"
            :member-status="memberStatus"
          />
          <ClosePanel
            v-if="isHost && status === 'voting'"
            :shortlist="store.shortlist"
            :selected-id="winnerId"
            :closing="closing"
            @select="pickedWinnerId = $event"
            @close="onClose"
          />
          <ActivityFeed :items="feedItems" />
        </div>
      </div>
    </template>
  </main>
</template>

<style scoped>
.eyebrow {
  color: var(--fp-accent);
  font-weight: 700;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.muted {
  color: var(--fp-muted);
}

.time-left {
  color: var(--fp-primary);
}

.closed {
  background: var(--fp-muted);
  color: var(--fp-surface);
}
</style>
