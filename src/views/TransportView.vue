   <script setup>
  // 07 Mode of transport
  // Owner: Nicole · Vet by: Surya
  import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
  import { fairness } from '@/utils/midpoint'
  import { useRoute, useRouter } from 'vue-router'
  import { useHangoutStore } from '@/stores/hangout'
  import { useAuthStore } from '@/stores/auth'
  import { rankStations } from '@/services/routing'
  import { saveMidpoint, subscribeToMembers, updateMemberMode } from '@/services/hangouts'
  import PersonModeRow from '@/components/transport/PersonModeRow.vue'
  import TravelTimePanel from '@/components/transport/TravelTimePanel.vue'

  const route = useRoute()
  const router = useRouter()
  const optimiseFor = ref('fairest')
  const ranked = ref([])
  const store = useHangoutStore()
  const missingMode = computed(() => store.members.filter((m) => !m.mode))
  const allPicked = computed(() => store.members.length > 0 && missingMode.value.length === 0)



  // The fairest MRT station: the 8 stations nearest the middle of everyone's starting points,
  // ranked by everyone's travel time with their own mode (rankStations in services/routing.js)
  async function scoreAreas() {
    const members = store.members.filter((m) => m.mode && m.start_lat != null)
    if (members.length === 0) return

    ranked.value = await rankStations(members, optimiseFor.value)
    if (ranked.value.length === 0) return

    const best = ranked.value[0]
    members.forEach((m, i) => {
      m.travel_mins = best.travelMins[i]
      m.travel_cost = best.travelCosts[i]
    })
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
    await scoreAreas()
    stopListening = subscribeToMembers(route.params.id, onMemberChanged)
  })

  onUnmounted(() => stopListening())
  watch(optimiseFor, scoreAreas)

  // Longest, shortest and gap across everyone's current travel times
  const stats = computed(() => {
    // Only people who've picked a mode have a travel time yet
    const times = store.members.filter((m) => m.travel_mins != null).map((m) => m.travel_mins)
    if (times.length === 0) return null
    const f = fairness(times)
    return { ...f, shortest: f.longest - f.gap }
  })



</script>

   <template>
    <section class="container py-4">
      <h1 class="title">How is everyone getting there?</h1>
      <p class="subtitle">
        Pick how you're getting there. Everyone picks their own, and you'll see your friends' choices
        as they make them.
      </p>
      <p v-if="modeError" class="text-danger small" role="alert">{{ modeError }}</p>

      <div class="row g-4">
        <!-- Left column: one row per person -->
        <div class="col-lg-8">
          <PersonModeRow
            v-for="m in store.members"
            :key="m.user_id"
            :member="m"
            :is-me="isMe(m)"
            @pick="pickMode(m, $event)"
          />
        </div>

        <!-- Right column: travel-time bars and candidate areas go here later -->
        <div v-if="stats" class="col-lg-4">
          <TravelTimePanel
            :members="store.members"
            :station-name="ranked[0]?.name"
            :longest="stats.longest"
          />

          <button
            v-if="allPicked"
            type="button"
            class="btn btn-primary btn-lg w-100"
            :disabled="saving || ranked.length === 0"
            @click="findMidpoint"
          >
            <span v-if="saving">Saving…</span>
            <span v-else>Find our midpoint →</span>
          </button>
          <template v-else>
            <button class="btn btn-primary btn-lg w-100" disabled>Find our midpoint →</button>
            <p class="footnote">
              Waiting for {{missingMode.map((m) => m.display_name).join(', ')}} to pick a mode
            </p>
          </template>
          <p v-if="saveError" class="footnote text-danger" role="alert">{{ saveError }}</p>
          <p class="footnote">Travel times via OneMap routing + LTA DataMall</p>
        </div>
      </div>
    </section>
  </template>

<style scoped>
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

/* Phones: slightly bigger text so it's easy to read */
@media (max-width: 575.98px) {
  .footnote {
    font-size: 0.875rem;
  }
}
</style>