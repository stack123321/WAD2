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
import VoteTurnout from '@/components/voting/VoteTurnout.vue'
import MemberAvatar from '@/components/voting/MemberAvatar.vue'
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
const totalVotes = computed(() => votes.value.length) // one row per person, so also "how many voted"

function memberOf(userId) {
  return store.members.find((m) => m.user_id === userId) ?? null
}
// The people behind each spot's votes, shown as avatars on its card
const votersBySpot = computed(() => {
  const result = {}
  for (const v of votes.value) {
    const member = memberOf(v.user_id)
    const voter = {
      userId: v.user_id,
      name: member?.display_name ?? 'Someone',
      color: member?.avatar_color ?? null,
    }
    result[v.shortlist_id] = [...(result[v.shortlist_id] ?? []), voter]
  }
  return result
})
// Members who haven't voted yet
const waiting = computed(() =>
  store.members.filter((m) => !votes.value.some((v) => v.user_id === m.user_id)),
)
const waitingText = computed(() => {
  const names = waiting.value.map((m) => (m.user_id === myId.value ? 'you' : m.display_name))
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
})

const winnerId = computed(() => pickedWinnerId.value ?? leader.value?.spot.id ?? null)

// Deadline
const deadline = computed(() => hangout.value?.vote_deadline ?? null)
const timeLeftText = computed(() => (deadline.value ? timeLeft(deadline.value, now.value) : null))
const deadlinePassed = computed(() => deadline.value !== null && timeLeftText.value === null)
const status = computed(() => hangout.value?.status)
const votingOpen = computed(() => status.value === 'voting' && !deadlinePassed.value)
const canVote = computed(() => votingOpen.value && myId.value !== null)

// Activity feed, newest first, with user and spot ids turned into names
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
      name:
        event.userId === myId.value ? 'You' : (memberOf(event.userId)?.display_name ?? 'Someone'),
      displayName: memberOf(event.userId)?.display_name ?? 'Someone',
      color: memberOf(event.userId)?.avatar_color ?? null,
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
    <div class="row g-4">
      <!-- Left (Figma: about two thirds): title, turnout, candidates -->
      <div class="col-12 col-lg-8">
        <header class="mb-3">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-1">
            <h1 class="h3 fw-bold mb-0">Group voting</h1>
            <p
              v-if="hangout && deadline"
              class="deadline small mb-0"
              :class="{ 'deadline--closed': !votingOpen }"
              :title="`Voting closes ${formatDateTime(deadline)} SGT`"
            >
              <span class="dot" aria-hidden="true"></span>
              <template v-if="votingOpen">
                Closes in <time :datetime="deadline">{{ timeLeftText }}</time>
              </template>
              <template v-else>Voting closed</template>
            </p>
          </div>
          <VoteTurnout
            v-if="hangout"
            :voted-count="totalVotes"
            :member-count="store.members.length"
          >
            Pick your favourite. Most votes wins; ties go to the higher group match.
          </VoteTurnout>
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
          <div v-else-if="deadlinePassed" class="alert alert-info">
            The deadline ({{ formatDateTime(deadline) }} SGT) has passed, so voting is closed.
            Waiting for the host to confirm the plan.
          </div>
          <div v-else-if="!myId" class="alert alert-warning">Log in to vote.</div>

          <CandidateList
            :shortlist="store.shortlist"
            :counts="counts"
            :voters-by-spot="votersBySpot"
            :total-votes="totalVotes"
            :leader-id="leaderId"
            :tied="tied"
            :my-vote-id="myVoteId"
            :disabled="!canVote"
            @vote="vote"
          />

          <div class="waiting d-flex align-items-center gap-2 mt-3">
            <template v-if="waiting.length">
              <span class="d-flex stack">
                <MemberAvatar
                  v-for="m in waiting"
                  :key="m.user_id"
                  :name="m.display_name"
                  :color="m.avatar_color"
                  :size="24"
                />
              </span>
              <span class="small">Waiting on {{ waitingText }}</span>
            </template>
            <span v-else class="small">Everyone has voted.</span>
          </div>

          <RouterLink
            v-if="votingOpen"
            class="btn suggest mt-3"
            :to="{ name: 'explore', params: { id: hangoutId } }"
          >
            + Suggest another spot
          </RouterLink>
        </template>
      </div>

      <!-- Right (Figma: about one third): activity, then the host's card -->
      <div v-if="hangout && !store.loading && !store.error" class="col-12 col-lg-4">
        <div class="d-flex flex-column gap-3">
          <ActivityFeed :items="feedItems" />
          <ClosePanel
            v-if="isHost && status === 'voting'"
            :shortlist="store.shortlist"
            :selected-id="winnerId"
            :deadline-text="deadline ? formatDateTime(deadline) : null"
            :closing="closing"
            @select="pickedWinnerId = $event"
            @close="onClose"
          />
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
/* "Closes in …" pill next to the title */
.deadline {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.2rem 0.75rem;
  border: 1px solid var(--fp-accent);
  border-radius: 999px;
  background: var(--fp-surface);
  font-weight: 600;
}

.dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--fp-accent);
}

.deadline--closed {
  border-color: var(--fp-border);
  color: var(--fp-muted);
}

.deadline--closed .dot {
  background: var(--fp-muted);
}

.waiting {
  background: var(--fp-surface);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius-sm);
  padding: 0.75rem 1rem;
}

.stack > :not(:first-child) {
  margin-left: -6px;
}

.suggest {
  --bs-btn-bg: var(--fp-surface);
  --bs-btn-color: var(--fp-ink);
  --bs-btn-border-color: var(--fp-border);
  --bs-btn-hover-bg: var(--fp-bg);
  --bs-btn-hover-color: var(--fp-ink);
  --bs-btn-hover-border-color: var(--fp-muted);
  font-weight: 600;
}
</style>
