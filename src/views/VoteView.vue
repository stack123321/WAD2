<script setup>
// 11 Group voting
// Owner: Eashvar · Vet by: Ryan
// Figma frame "11". While the hangout is still collecting, the host starts the vote (members see
// who they're waiting for). Then everyone votes for one shortlisted spot and can change it until
// the deadline (shown as a countdown in SGT). The page keeps its own copy of the votes so the tally
// updates straight away (also in demo mode), re-fetches all votes on every Realtime change, and
// lists activity seen while open, next to Surya's group chat (members only). "Me" is the logged-in
// user, or in demo mode the host, so the host controls can be tried without keys.
// Validation: only members can vote (others are told why), only one vote is sent at a time, only
// each current member's latest vote counts, and the host can't close a vote nobody has voted in.
// The host can close the vote and pick the winner. Once voting is over (deadline passed or
// everyone voted) and the top spots are tied, the host's close card is replaced by the tie-break
// wheel: any member spins, the database picks the winner, and it's announced in the chat.
// The store is updated directly after starting, closing or spinning (a forced reload would reset
// the demo hangout).
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHangoutStore } from '@/stores/hangout'
import { useAuthStore } from '@/stores/auth'
import {
  castVote,
  closeVote,
  getVotes,
  isMockHangout,
  spinTiebreak,
  startVote,
  subscribeToVotes,
  changeVoteDeadline,
} from '@/services/votes'
import { getHangout } from '@/services/hangouts'
import { sendMessage } from '@/services/chat'
import CandidateList from '@/components/voting/CandidateList.vue'
import VoteTurnout from '@/components/voting/VoteTurnout.vue'
import MemberAvatar from '@/components/voting/MemberAvatar.vue'
import StartPanel from '@/components/voting/StartPanel.vue'
import ClosePanel from '@/components/voting/ClosePanel.vue'
import SpinWheel from '@/components/voting/SpinWheel.vue'
import ActivityFeed from '@/components/voting/ActivityFeed.vue'
import DeadlinePanel from '@/components/voting/DeadlinePanel.vue'
import HangoutChat from '@/components/start/HangoutChat.vue'
import {
  countableVotes,
  countVotes,
  closeOptions,
  changeOptions,
  diffVotes,
  formatDateTime,
  pickLeader,
  tiedLeaders,
  timeLeft,
} from '@/components/voting/voteHelpers'

const SPIN_MS = 3200

const route = useRoute()
const router = useRouter()
const store = useHangoutStore()
const auth = useAuthStore()

const hangoutId = route.params.id
const isMock = isMockHangout(hangoutId)

const votes = ref([])
const history = ref([])
const now = ref(Date.now())
const pickedWinnerId = ref(null)
const actionError = ref('')
const closing = ref(false)
const starting = ref(false)
const changingDeadline = ref(false)
const savingId = ref(null)
const spinning = ref(false)
const spinWinnerId = ref(null)
const spinSpots = ref([])

let nextEventId = 1
let unsubscribe = () => {}
let timer = null

const hangout = computed(() => store.hangout)

const myId = computed(() => auth.user?.id ?? (isMock ? (hangout.value?.host_id ?? null) : null))
const isHost = computed(() => myId.value !== null && myId.value === hangout.value?.host_id)
const isMember = computed(() => store.members.some((m) => m.user_id === myId.value))
const myVoteId = computed(
  () => votes.value.find((v) => v.user_id === myId.value)?.shortlist_id ?? null,
)

const rows = computed(() => countVotes(store.shortlist, votes.value))
const counts = computed(() => {
  const result = {}
  for (const row of rows.value) result[row.spot.id] = row.count
  return result
})
const leader = computed(() => pickLeader(rows.value))
const leaderId = computed(() => (leader.value?.count > 0 ? leader.value.spot.id : null))
const tiedSpots = computed(() => tiedLeaders(rows.value))
const tiedIds = computed(() => tiedSpots.value.map((spot) => spot.id))
const totalVotes = computed(() => votes.value.length)

function memberOf(userId) {
  return store.members.find((m) => m.user_id === userId) ?? null
}
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
const waiting = computed(() =>
  store.members.filter((m) => !votes.value.some((v) => v.user_id === m.user_id)),
)
const waitingText = computed(() => {
  const names = waiting.value.map((m) => (m.user_id === myId.value ? 'you' : m.display_name))
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
})

const winnerId = computed(() => pickedWinnerId.value ?? leader.value?.spot.id ?? null)

const deadline = computed(() => hangout.value?.vote_deadline ?? null)
const timeLeftText = computed(() => (deadline.value ? timeLeft(deadline.value, now.value) : null))
const deadlinePassed = computed(() => deadline.value !== null && timeLeftText.value === null)
const status = computed(() => hangout.value?.status)
const votingOpen = computed(() => status.value === 'voting' && !deadlinePassed.value)
const canVote = computed(() => votingOpen.value && isMember.value)
// where the host can move the closing time to once voting has started
const moveOptions = computed(() => changeOptions(hangout.value?.starts_at, now.value))

// when voting can close, for the host's "Voting closes" menu on the start card
const startOptions = computed(() =>
  closeOptions(hangout.value?.vote_deadline, hangout.value?.starts_at, now.value),
)
const hostName = computed(() => memberOf(hangout.value?.host_id)?.display_name ?? 'the host')
const everyoneVoted = computed(() => store.members.length > 0 && waiting.value.length === 0)
const votingOver = computed(
  () => status.value === 'voting' && (deadlinePassed.value || everyoneVoted.value),
)
const needsSpin = computed(() => votingOver.value && tiedSpots.value.length > 1)

function spotName(spotId) {
  return store.shortlist.find((s) => s.id === spotId)?.name ?? 'a removed spot'
}
const feedItems = computed(() =>
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

function applyVotes(allVotes) {
  const next = countableVotes(allVotes, store.members)
  const events = diffVotes(votes.value, next, new Date().toISOString())
    .sort((a, b) => new Date(a.at) - new Date(b.at))
    .map((event) => ({ ...event, id: nextEventId++ }))
  history.value.push(...events)
  votes.value = next
  return events
}

async function refreshVotes() {
  if (!store.hangout) return
  try {
    applyVotes(await getVotes(hangoutId))
  } catch (e) {
    actionError.value = `Couldn't refresh the votes: ${e.message}`
  }
}

async function vote(spotId) {
  if (!canVote.value || savingId.value !== null || spotId === myVoteId.value) return
  actionError.value = ''
  savingId.value = spotId
  const before = votes.value
  const mine = { user_id: myId.value, shortlist_id: spotId, voted_at: new Date().toISOString() }
  const added = applyVotes([...before.filter((v) => v.user_id !== myId.value), mine])
  try {
    await castVote(hangoutId, myId.value, spotId)
  } catch (e) {
    votes.value = before
    history.value = history.value.filter((event) => !added.includes(event))
    actionError.value = `Your vote wasn't saved: ${e.message}`
  } finally {
    savingId.value = null
  }
}

// The host moves when voting closes; moving a passed deadline ahead opens voting again
async function onChangeDeadline(deadlineIso) {
  changingDeadline.value = true
  actionError.value = ''
  try {
    await changeVoteDeadline(hangoutId, deadlineIso)
    store.hangout.vote_deadline = deadlineIso
  } catch (e) {
    actionError.value = `Couldn't change when voting closes: ${e.message}`
  } finally {
    changingDeadline.value = false
  }
}

async function onStart(deadlineIso) {
  if (store.shortlist.length === 0 || !deadlineIso) return
  starting.value = true
  actionError.value = ''
  try {
    await startVote(hangoutId, deadlineIso)
    store.hangout.status = 'voting'
    store.hangout.vote_deadline = deadlineIso
  } catch (e) {
    actionError.value = `Couldn't start the vote: ${e.message}`
  } finally {
    starting.value = false
  }
}

async function onClose(spotId) {
  if (totalVotes.value === 0) {
    actionError.value = 'Nobody has voted yet, so the vote can’t be closed.'
    return
  }
  closing.value = true
  actionError.value = ''
  try {
    await closeVote(hangoutId, spotId)
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

async function onSpin() {
  if (!needsSpin.value || spinning.value || !isMember.value) return
  spinning.value = true
  actionError.value = ''
  spinSpots.value = tiedSpots.value
  try {
    const winner = await spinTiebreak(hangoutId, tiedIds.value)
    spinWinnerId.value = winner
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    await new Promise((resolve) => setTimeout(resolve, reduceMotion ? 0 : SPIN_MS))
    store.hangout.status = 'confirmed'
    store.hangout.final_shortlist_id = winner
    store.hangout.votes = votes.value
    await announceWinner(winner)
  } catch (e) {
    if (/already closed/i.test(e.message)) {
      actionError.value = 'Someone else has already spun the wheel.'
      store.hangout = await getHangout(hangoutId)
    } else {
      actionError.value = `Couldn't spin the wheel: ${e.message}`
    }
  } finally {
    spinning.value = false
  }
}

async function announceWinner(spotId) {
  if (isMock) return
  try {
    await sendMessage(hangoutId, `🎡 Tie-break: the wheel picked ${spotName(spotId)}!`)
  } catch {
    actionError.value = 'The winner is saved, but the chat message didn’t send.'
  }
}

onMounted(async () => {
  unsubscribe = subscribeToVotes(hangoutId, refreshVotes)
  timer = setInterval(() => {
    now.value = Date.now()
  }, 30000)

  await store.load(hangoutId)
  if (store.error) return
  try {
    const start = isMock ? store.votes.map((v) => ({ ...v })) : await getVotes(hangoutId)
    applyVotes(start)
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
      <div class="col-12 col-lg-8">
        <header class="mb-3">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-1">
            <h1 class="h3 fw-bold mb-0">Group voting</h1>
            <p
              v-if="hangout && (deadline || status === 'collecting')"
              class="deadline small mb-0"
              :class="{ 'deadline--closed': !votingOpen }"
              :title="deadline ? `Voting closes ${formatDateTime(deadline)} SGT` : null"
            >
              <span class="dot" aria-hidden="true"></span>
              <template v-if="status === 'collecting'">Not started</template>
              <template v-else-if="votingOpen">
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
            Pick your favourite. Most votes wins; a tie is settled by spinning a wheel.
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
            <template v-if="isHost">
              Voting hasn't started yet. Start it when the shortlist is ready, and everyone can pick
              their favourite.
            </template>
            <template v-else>Waiting for {{ hostName }} to start the vote.</template>
          </div>
          <div v-else-if="status === 'confirmed' || status === 'done'" class="alert alert-info">
            Voting is closed.
            <RouterLink :to="{ name: 'final-plan', params: { id: hangoutId } }">
              See the final plan
            </RouterLink>
          </div>
          <div v-else-if="needsSpin" class="alert alert-info">
            Voting is over and it's a tie. Anyone in the group can spin the wheel to pick the
            winner.
          </div>
          <div v-else-if="deadlinePassed" class="alert alert-info">
            The deadline ({{ formatDateTime(deadline) }} SGT) has passed, so voting is closed.
            Waiting for the host to confirm the plan.
          </div>
          <div v-else-if="!myId" class="alert alert-warning">Log in to vote.</div>
          <div v-else-if="!isMember" class="alert alert-warning">
            You're not in this hangout, so you can't vote. Ask the host for an invite link.
          </div>

          <CandidateList
            :shortlist="store.shortlist"
            :counts="counts"
            :voters-by-spot="votersBySpot"
            :total-votes="totalVotes"
            :leader-id="leaderId"
            :tied-ids="tiedIds"
            :my-vote-id="myVoteId"
            :saving-id="savingId"
            :disabled="!canVote"
            @vote="vote"
          />

          <div v-if="status === 'voting'" class="waiting d-flex align-items-center gap-2 mt-3">
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
            v-if="votingOpen || status === 'collecting'"
            class="btn suggest mt-3"
            :to="{ name: 'explore', params: { id: hangoutId } }"
          >
            + Suggest another spot
          </RouterLink>
        </template>
      </div>

      <div v-if="hangout && !store.loading && !store.error" class="col-12 col-lg-4">
        <div class="d-flex flex-column gap-3">
          <StartPanel
            v-if="isHost && status === 'collecting'"
            :spot-count="store.shortlist.length"
            :options="startOptions"
            :explore-to="{ name: 'explore', params: { id: hangoutId } }"
            :starting="starting"
            @start="onStart"
          />
          <SpinWheel
            v-if="isMember && (needsSpin || spinWinnerId)"
            :spots="spinWinnerId ? spinSpots : tiedSpots"
            :winner-id="spinWinnerId"
            :spinning="spinning"
            :plan-to="{ name: 'final-plan', params: { id: hangoutId } }"
            @spin="onSpin"
          />
          <DeadlinePanel
            v-if="isHost && status === 'voting'"
            :deadline="deadline"
            :closed="deadlinePassed"
            :options="moveOptions"
            :saving="changingDeadline"
            @change="onChangeDeadline"
          />
          <ActivityFeed :items="feedItems" />
          <HangoutChat v-if="myId && isMember" :hangout="hangout" :my-id="myId" />
          <ClosePanel
            v-if="isHost && status === 'voting' && !needsSpin"
            :shortlist="store.shortlist"
            :selected-id="winnerId"
            :vote-count="totalVotes"
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
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: 44px;
}

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
