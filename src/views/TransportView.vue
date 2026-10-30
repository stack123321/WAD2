<script setup>
// 07 Mode of transport
// Owner: Nicole · Vet by: Surya
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHangoutStore } from '@/stores/hangout'
import { useAuthStore } from '@/stores/auth'
import { rankStations } from '@/services/routing'
import {
  getMyHangouts,
  saveMidpoint,
  subscribeToMembers,
  updateMemberMode,
} from '@/services/hangouts'
import { sendMessage } from '@/services/chat'
import { hasSupabase } from '@/services/supabase'
import PersonModeRow from '@/components/transport/PersonModeRow.vue'
import PageBand from '@/components/ui/PageBand.vue'

const route = useRoute()
const router = useRouter()
const optimiseFor = ref('fairest')
const ranked = ref([])
const store = useHangoutStore()
const missingMode = computed(() => store.members.filter((m) => !m.mode))

// The fairest MRT station: the 8 stations nearest the middle of everyone's starting points,
// ranked by everyone's travel time with their own mode (rankStations in services/routing.js)
// (Surya) Nobody waits for friends: anyone who hasn't picked a mode yet counts as MRT for now,
// and their row says "assuming MRT". When they pick, it's worked out again with their real mode.
// Each ranking gets a number. A second click or a friend's change can start a new one before
// the last has finished; only the latest is allowed to update the page
let latestRanking = 0
const working = ref(false) // true while the travel times are being worked out

async function scoreAreas() {
  const members = store.members.filter((m) => m.start_lat != null)
  if (members.length === 0) return

  latestRanking++
  const thisRanking = latestRanking
  working.value = true

  const withModes = []
  for (const m of members) {
    withModes.push({ ...m, mode: m.mode || 'mrt' })
  }

  try {
    const result = await rankStations(withModes, optimiseFor.value)
    if (thisRanking !== latestRanking) return // a newer ranking started: throw this one away

    ranked.value = result
    if (result.length === 0) return
    const best = result[0]
    members.forEach((m, i) => {
      m.travel_mins = best.travelMins[i]
      m.travel_cost = best.travelCosts[i]
    })
  } finally {
    if (thisRanking === latestRanking) working.value = false // only the latest one turns it off
  }
}

// "Find our midpoint": save the fairest station for the whole group, then show it on page 08
const saving = ref(false)
const saveError = ref('')

async function findMidpoint() {
  const best = ranked.value[0]
  if (!best) return
  saving.value = true
  saveError.value = ''
  const midpoint = {
    name: best.name,
    lat: best.lat,
    lng: best.lng,
    avgMins: best.average,
    gapMins: best.gap,
  }
  try {
    await saveMidpoint(route.params.id, midpoint)
    // Page 08 reads it from the store straight away
    store.hangout.midpoint_name = midpoint.name
    store.hangout.midpoint_lat = midpoint.lat
    store.hangout.midpoint_lng = midpoint.lng
    store.hangout.avg_mins = midpoint.avgMins
    store.hangout.gap_mins = midpoint.gapMins
    router.push({ name: 'midpoint', params: { id: route.params.id } })
  } catch (e) {
    console.error(e)
    saveError.value = "Couldn't save the midpoint. Try again."
  }
  saving.value = false
}

// Each person picks their own mode. In the demo hangout (sample people) you're Surya, like on 06.
const auth = useAuthStore()
const myId = computed(() => {
  if (route.params.id === 'demo' || !auth.user) return 'u-surya'
  return auth.user.id
})

function isMe(m) {
  return m.user_id === myId.value
}

// (Eashvar, design catalogue A1) your own row first, since it's the only one you can change
const membersMeFirst = computed(() => [
  ...store.members.filter((m) => isMe(m)),
  ...store.members.filter((m) => !isMe(m)),
])

// Pick your mode: show it straight away, save it so friends see it, then re-rank the stations
const modeError = ref('')

async function pickMode(m, mode) {
  if (!isMe(m)) return
  const previous = m.mode
  m.mode = mode
  modeError.value = ''
  try {
    await updateMemberMode(route.params.id, m.user_id, mode)
  } catch (e) {
    console.error(e)
    m.mode = previous
    modeError.value = "Couldn't save your mode. Try again."
    return
  }
  try {
    await scoreAreas()
  } catch (e) {
    console.error('Could not get travel times', e)
  }
}

// Remind a friend who's holding the group up, without going back to 06: posts a message that
// tags them in the hangout's group chat (it shows up live for everyone there). The demo hangouts
// have no chat, so there it copies the message (and the invite link) to paste instead.
const remindedId = ref(null) // user_id of the friend who was just reminded
const remindStatus = ref('') // "Sent ✓" or "Copied ✓" for 3 seconds
const remindError = ref('')

async function doRemind(member) {
  remindError.value = ''
  const hangoutName = store.hangout.name
  let text = `@${member.display_name}, please pick how you're getting there for "${hangoutName}" 🚇`
  if (member.start_lat == null) {
    text = `@${member.display_name}, please add where you're coming from for "${hangoutName}" 📍`
  }

  try {
    if (route.params.id.startsWith('demo') || !hasSupabase) {
      const inviteLink = `${window.location.origin}/login?invite=${store.hangout.invite_code}`
      await navigator.clipboard.writeText(`${text} ${inviteLink}`)
      remindStatus.value = 'Copied ✓'
    } else {
      await sendMessage(route.params.id, text)
      remindStatus.value = 'Sent ✓'
    }
    remindedId.value = member.user_id
    setTimeout(() => {
      remindedId.value = null
      remindStatus.value = ''
    }, 3000)
  } catch (e) {
    console.error(e)
    remindError.value = `Couldn't remind ${member.display_name}. Try again.`
  }
}

// Live updates: when a friend picks their mode (or changes their starting point), copy it into
// our store and re-rank, so everyone sees the same thing without refreshing
let stopListening = () => {}

function onMemberChanged(row) {
  const member = store.members.find((m) => m.user_id === row.user_id)
  if (!member) return
  member.mode = row.mode
  member.start_label = row.start_label
  member.start_lat = row.start_lat
  member.start_lng = row.start_lng
  scoreAreas().catch((e) => console.error('Could not get travel times', e))
}

onMounted(async () => {
  await store.load(route.params.id)
  await useUsualMode()
  await scoreAreas()
  stopListening = subscribeToMembers(route.params.id, onMemberChanged)
})

// (Surya) Remember my usual mode: if I haven't picked one here yet, pick the mode I used in my
// latest other hangout, so most people don't need to click at all. They can still change it.
const usualModeNote = ref('')

async function useUsualMode() {
  const me = store.members.find((m) => isMe(m))
  if (!me || me.mode) return
  try {
    const hangouts = await getMyHangouts()
    let latest = null // best-so-far: my latest other hangout where I picked a mode
    for (const h of hangouts) {
      if (h.id === route.params.id) continue
      const mine = h.members.find((m) => m.user_id === myId.value)
      if (!mine || !mine.mode) continue
      if (latest === null || new Date(h.starts_at) > new Date(latest.starts_at)) {
        latest = { starts_at: h.starts_at, mode: mine.mode }
      }
    }
    if (!latest) return
    me.mode = latest.mode
    await updateMemberMode(route.params.id, me.user_id, latest.mode)
    usualModeNote.value = `${modeName(latest.mode)}, like last time. Change it anytime.`
  } catch (e) {
    // only a shortcut: if it fails, you just pick your mode yourself
    console.error(e)
  }
}

function modeName(mode) {
  const names = { mrt: 'MRT', bus: 'Bus', car: 'Car', walk: 'Walking' }
  return names[mode] || mode
}

// "Ryan hasn't picked yet…" / "Ryan and Nicole haven't picked yet…"
const waitingNote = computed(() => {
  const names = missingMode.value.map((m) => m.display_name)
  if (names.length === 1) {
    return `${names[0]} hasn’t picked yet, so we’re assuming MRT for now.`
  }
  const last = names[names.length - 1]
  return `${names.slice(0, -1).join(', ')} and ${last} haven’t picked yet, so we’re assuming MRT for now.`
})

// I can find the midpoint once I've picked my own mode (friends can pick later)
const myModePicked = computed(() => {
  const me = store.members.find((m) => isMe(m))
  return me !== undefined && Boolean(me.mode)
})

onUnmounted(() => stopListening())
watch(optimiseFor, scoreAreas)
</script>

<template>
  <section>
    <PageBand
      title="How is everyone getting there?"
      lead="Pick how you’re getting there. Your friends pick their own."
      size="short"
    >
      <p v-if="usualModeNote" class="band-note">✓ {{ usualModeNote }}</p>
      <p v-if="modeError" class="band-note band-note--error" role="alert">{{ modeError }}</p>
    </PageBand>

    <div class="container fp-pull">
      <div class="row g-4">
        <!-- Left column: one row per person -->
        <div class="col-lg-8">
          <PersonModeRow
            v-for="m in membersMeFirst"
            :key="m.user_id"
            :member="m"
            :is-me="isMe(m)"
            :updating="working"
            :remind-status="remindedId === m.user_id ? remindStatus : ''"
            @pick="pickMode(m, $event)"
            @remind="doRemind(m)"
          />

          <!-- Says where the reminder went (the prof asked "how is the reminder sent?") -->
          <p v-if="remindStatus === 'Sent ✓'" class="small remind-note" role="status">
            Posted in the group chat ·
            <!-- from=transport: the chat page then offers "← Back to Transport" -->
            <RouterLink
              :to="{
                name: 'chat',
                params: { hangoutId: route.params.id },
                query: { from: 'transport' },
              }"
            >
              Open chat →
            </RouterLink>
          </p>
          <p v-else-if="remindStatus === 'Copied ✓'" class="small remind-note" role="status">
            Copied the reminder. Paste it to them (the demo hangout has no group chat).
          </p>
          <p v-if="remindError" class="text-danger small" role="alert">{{ remindError }}</p>
        </div>

        <!-- Right column: the next step. Which station, and why, is shown on the next page (08) -->
        <div class="col-lg-4">
          <section class="next-card">
            <h2 class="next-title">Ready?</h2>
            <p class="next-text">
              {{ store.members.length - missingMode.length }} of {{ store.members.length }} have
              picked how they’re getting there.
            </p>
            <!-- Works once YOU have picked a mode; friends who haven't count as MRT for now.
                 Waits while the times are being worked out, so we never save a station that's
                 about to change -->
            <button
              type="button"
              class="btn btn-primary btn-lg w-100"
              :disabled="saving || working || ranked.length === 0 || !myModePicked"
              @click="findMidpoint()"
            >
              <span v-if="saving">Saving…</span>
              <span v-else>Find our midpoint →</span>
            </button>
            <p v-if="!myModePicked" class="footnote">Pick how you’re getting there first.</p>
            <p v-else-if="missingMode.length > 0" class="footnote">{{ waitingNote }}</p>
            <p v-if="saveError" class="footnote text-danger" role="alert">{{ saveError }}</p>
          </section>
          <p class="footnote">Travel times via OneMap routing + LTA DataMall</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* (Eashvar, design catalogue A1) notes under the band's title */
.band-note {
  display: inline-block;
  margin: 0.75rem 0 0;
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.14);
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
}

.band-note--error {
  background: var(--fp-accent);
  color: var(--fp-deep);
}

.title {
  font-size: 1.75rem;
  font-weight: 800;
  margin-bottom: 0.25rem;
}

.subtitle {
  color: var(--fp-muted);
  font-size: 0.9rem;
  margin-bottom: 1.25rem;
}

/* Coloured circle with the person's initial */
.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: var(--fp-surface);
  font-weight: 700;
  flex-shrink: 0;
}

.area-best {
  background: color-mix(in srgb, var(--fp-primary) 12%, var(--fp-surface));
}

/* area | avg time | gap */
.area-row {
  display: grid;
  grid-template-columns: 1fr 80px 60px;
  align-items: center;
  padding: 0.6rem 0.75rem;
  border-radius: var(--fp-radius-sm);
  font-size: 0.9rem;
}

.area-row span:nth-child(n + 2) {
  text-align: right;
}

.area-head {
  color: var(--fp-muted);
  font-size: 0.8rem;
  padding-bottom: 0.25rem;
}

.badge-best {
  background: var(--fp-primary);
  color: var(--fp-surface);
  border-radius: 99px;
  padding: 0.1rem 0.5rem;
  font-size: 0.7rem;
  margin-left: 0.35rem;
}

.footnote {
  color: var(--fp-muted);
  font-size: 0.75rem;
  margin-top: 0.6rem;
}

/* "Posted in the group chat · Open chat →" under the cards, after a Remind */
.remind-note {
  color: var(--fp-muted);
  margin-bottom: 0.5rem;
}

/* (Surya) "MRT, like last time." */
.usual-note {
  color: var(--fp-primary);
  font-weight: 600;
}

/* (Surya) "Ready?" card with the button */
.next-card {
  padding: 1.25rem;
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
  background: var(--fp-surface);
}

.next-title {
  margin-bottom: 0.25rem;
  font-size: 1.1rem;
  font-weight: 700;
}

.next-text {
  color: var(--fp-muted);
  font-size: 0.9rem;
}

/* Phones: slightly bigger text so it's easy to read */
@media (max-width: 575.98px) {
  .footnote {
    font-size: 0.875rem;
  }
}
</style>
