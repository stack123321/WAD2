   <script setup>
  // 07 Mode of transport
  // Owner: Nicole
  import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useHangoutStore } from '@/stores/hangout'
  import { useAuthStore } from '@/stores/auth'
  import { rankStations } from '@/services/routing'
  import { timesFor } from '@/utils/midpoint'
  import {
    getMyHangouts,
    saveMidpoint,
    subscribeToHangout,
    subscribeToMembers,
    updateMemberMode,
  } from '@/services/hangouts'
  import { sendMessage } from '@/services/chat'
  import { hasSupabase } from '@/services/supabase'
  import PersonModeRow from '@/components/transport/PersonModeRow.vue'
  import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
  import { useHangoutPrerequisites } from '@/composables/useHangoutPrerequisites'
  import MissingPrerequisite from '@/components/hangout/MissingPrerequisite.vue'

  const route = useRoute()
  const router = useRouter()
  const optimiseFor = ref('fairest')
  const ranked = ref([])
  const store = useHangoutStore()
  const missingStep = useHangoutPrerequisites(() => store.hangout, ['starting-points']).missingStep
  const missingMode = computed(() => store.members.filter((m) => !m.mode))



  // The fairest MRT station: the 8 stations nearest the middle of everyone's starting points,
  // ranked by everyone's travel time with their own mode (rankStations in services/routing.js)
  // (Surya) Nobody waits for friends: anyone who hasn't picked a mode yet counts as MRT for now,
  // and their row says "assuming MRT". When they pick, it's worked out again with their real mode.
  // Each ranking gets a number. A second click or a friend's change can start a new one before
  // the last has finished; only the latest is allowed to update the page
  let latestRanking = 0
  const working = ref(false) // true while the travel times are being worked out
  const progress = ref({ done: 0, total: 0 }) // (Surya) stations checked so far, for the progress bar
  const rankError = ref('') // (Surya) shown with a Try again button when the times couldn't be worked out

  // (Surya) how full the progress bar is, 0–100
  const progressPercent = computed(() => {
    if (progress.value.total === 0) {
      return 0
    }
    return Math.round((progress.value.done / progress.value.total) * 100)
  })

  async function scoreAreas() {
    const members = store.members.filter((m) => m.start_lat != null)
    if (members.length === 0) return

    latestRanking++
    const thisRanking = latestRanking
    working.value = true
    rankError.value = ''

    const withModes = []
    for (const m of members) {
      withModes.push({ ...m, mode: m.mode || 'mrt' })
    }

    // only the latest ranking moves the progress bar
    function onProgress(done, total) {
      if (thisRanking === latestRanking) {
        progress.value = { done, total }
      }
    }

    try {
      const result = await rankStations(withModes, optimiseFor.value, onProgress)
      if (thisRanking !== latestRanking) return // a newer ranking started: throw this one away

      ranked.value = result
      if (result.length === 0) return
      const best = result[0]
      members.forEach((m, i) => {
        m.travel_mins = best.travelMins[i]
        m.travel_cost = best.travelCosts[i]
      })
    } catch (error) {
      // (Surya) say so instead of leaving the button greyed out with no reason
      console.error('Could not get travel times', error)
      if (thisRanking === latestRanking) {
        rankError.value = 'Couldn’t work out the travel times. Try again.'
      }
    } finally {
      if (thisRanking === latestRanking) working.value = false // only the latest one turns it off
    }
  }

  // "Find our midpoint": save the fairest station for the whole group, then show it on page 08
  const saving = ref(false)
  const saveError = ref('')

  // (Ryan) a different station clears the shortlist and its votes, so ask first when there are spots to lose
  const askingMove = ref(false)

  // (Ryan) the host has locked the midpoint on 08, so it can't be found again here
  const midpointLocked = computed(
    () => store.hangout !== null && store.hangout.midpoint_locked === true,
  )
  // "Ryan locked the midpoint at Farrer Road.", or for the host how to undo it
  const lockedNote = computed(() => {
    const station = store.hangout.midpoint_name
    if (store.hangout.host_id === myId.value) {
      return `You locked the midpoint at ${station}. Unlock it on Midpoint to change it.`
    }
    return `${store.hostName} locked the midpoint at ${station}.`
  })

  function onFindMidpoint() {
    const best = ranked.value[0]
    if (!best) return
    if (best.name !== store.hangout.midpoint_name && store.shortlist.length > 0) {
      askingMove.value = true
      return
    }
    findMidpoint()
  }

  function confirmFind() {
    askingMove.value = false
    findMidpoint()
  }

  async function findMidpoint() {
    const best = ranked.value[0]
    if (!best) return
    saving.value = true
    saveError.value = ''

    const members = store.members.filter((m) => m.start_lat != null)
    const midpoint = {
      name: best.name,
      lat: best.lat,
      lng: best.lng,
      avgMins: best.average,
      gapMins: best.gap,
      times: timesFor(members, best),
    }
    try {
      await saveMidpoint(route.params.id, midpoint)
      if (midpoint.name !== store.hangout.midpoint_name) store.clearSpots() // checked before the name changes below
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
  let stopHangout = () => {}

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
    if (store.error) return
    await useUsualMode()
    await scoreAreas()
    stopListening = subscribeToMembers(route.params.id, onMemberChanged)
    stopHangout = subscribeToHangout(route.params.id, store.applyChange) // (Ryan) e.g. the host locks it on 08
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

  onUnmounted(() => {
    stopListening()
    stopHangout()
  })
  watch(optimiseFor, scoreAreas)




</script>

   <template>
    <div
      v-if="store.loading"
      class="d-flex align-items-center gap-2 text-secondary p-5"
      role="status"
    >
      <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
      Loading hangout…
    </div>

    <div v-else-if="store.error" class="container py-5">
      <div class="alert alert-danger" role="alert">
        Couldn't load this hangout. Check the link, or go back to
        <RouterLink :to="{ name: 'dashboard' }">My hangouts</RouterLink>.
      </div>
    </div>

    <div v-else-if="missingStep" class="container py-4">
      <MissingPrerequisite :hangout-id="String(route.params.id)" :step="missingStep" />
    </div>

    <section v-else-if="store.hangout" class="container py-4">
      <h1 class="title page-title">How is everyone getting there?</h1>
      <p class="subtitle">Pick how you’re getting there. Your friends pick their own.</p>
      <p v-if="usualModeNote" class="usual-note small">✓ {{ usualModeNote }}</p>
      <p v-if="modeError" class="text-danger small" role="alert">{{ modeError }}</p>

      <div class="row g-4">
        <!-- Left column: one row per person -->
        <div class="col-lg-8">
          <PersonModeRow
            v-for="m in store.members"
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
            <!-- (Ryan) opens the chat on top of this page, like 💬 in the step bar -->
            <button
              type="button"
              class="btn btn-link btn-sm p-0 align-baseline"
              @click="store.chatOpen = true"
            >
              Open chat →
            </button>
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
            <!-- (Ryan) locked on 08: there's nothing to find here, so the next step is to look at it -->
            <router-link
              v-if="midpointLocked"
              :to="{ name: 'midpoint', params: { id: route.params.id } }"
              class="btn btn-primary btn-lg w-100"
            >
              See the midpoint →
            </router-link>
            <button
              v-else
              type="button"
              class="btn btn-primary btn-lg w-100"
              :disabled="saving || working || ranked.length === 0 || !myModePicked"
              @click="onFindMidpoint()"
            >
              <span v-if="saving">Saving…</span>
              <span v-else-if="working">Working out times…</span>
              <span v-else>Find our midpoint →</span>
            </button>
            <!-- (Surya) why the button is greyed out: 8 stations × everyone's trip, from OneMap -->
            <div v-if="working && !midpointLocked" class="rank-progress">
              <div
                class="progress"
                role="progressbar"
                aria-label="Working out travel times"
                aria-valuemin="0"
                :aria-valuemax="progress.total"
                :aria-valuenow="progress.done"
              >
                <div class="progress-bar" :style="{ width: progressPercent + '%' }"></div>
              </div>
              <p class="footnote mb-0">
                Working out everyone’s travel times… {{ progress.done }} of
                {{ progress.total }} stations
              </p>
            </div>
            <div v-else-if="rankError && !midpointLocked" class="rank-error">
              <p class="footnote text-danger mb-2" role="alert">{{ rankError }}</p>
              <button type="button" class="btn btn-outline-primary w-100" @click="scoreAreas()">
                Try again
              </button>
            </div>
            <p v-if="midpointLocked" class="footnote">🔒 {{ lockedNote }}</p>
            <p v-else-if="!myModePicked" class="footnote">Pick how you’re getting there first.</p>
            <p v-else-if="missingMode.length > 0" class="footnote">{{ waitingNote }}</p>
            <p v-if="saveError" class="footnote text-danger" role="alert">{{ saveError }}</p>
          </section>
          <p class="footnote">Travel times via OneMap routing + LTA DataMall</p>
        </div>
      </div>

      <ConfirmDialog
        :open="askingMove"
        :title="ranked[0] ? `Move the midpoint to ${ranked[0].name} MRT?` : ''"
        text="The shortlisted spots and any votes on them will be cleared, so the group picks spots near the new midpoint."
        button="Move midpoint"
        danger
        @confirm="confirmFind"
        @cancel="askingMove = false"
      />
    </section>
  </template>

<style scoped>
.title {
  margin-bottom: 0.25rem;
}

.subtitle {
  color: var(--fp-muted);
  font-size: 0.9rem;
  margin-bottom: 1.25rem;
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

/* (Surya) thin bar under the button while the travel times are worked out */
.rank-progress {
  margin-top: 0.75rem;
}

/* Bootstrap's progress bar, thin and in our colours (like the vote bars on 11) */
.rank-progress .progress {
  height: 6px;
  background: var(--fp-border);
}

.rank-progress .progress-bar {
  background: var(--fp-primary);
}

.rank-error {
  margin-top: 0.75rem;
}

.rank-error .btn {
  min-height: 44px;
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