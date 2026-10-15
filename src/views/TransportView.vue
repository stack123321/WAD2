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
  import MemberAvatar from '@/components/voting/MemberAvatar.vue'

  const route = useRoute()
  const router = useRouter()
  const optimiseFor = ref('fairest')
  const ranked = ref([])
  const store = useHangoutStore()
  const modes = ['mrt', 'bus', 'car', 'walk']
  const labels = { mrt: 'MRT', bus: 'Bus', car: 'Car', walk: 'Walk' }
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

  // Bar length as a percentage; the full bar represents at least 40 minutes
  function barWidth(mins) {
    const scale = Math.max(40, stats.value.longest)
    return (mins / scale) * 100 + '%'
  }


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
          <div v-for="m in store.members" :key="m.user_id" class="person">
            <MemberAvatar :name="m.display_name" :color="m.avatar_color" :size="36" />

            <div class="who">
              <div class="name">
                {{ m.display_name }}<span v-if="isMe(m)"> (you)</span>
              </div>
              <div class="from">From {{ m.start_label }}</div>
            </div>

            <!-- Your row: pick your mode. Friends' rows: shows what they picked (they choose it) -->
            <div class="segmented" :class="{ 'segmented--readonly': !isMe(m) }">
              <button
                v-for="mode in modes"
                :key="mode"
                type="button"
                :class="{ active: m.mode === mode }"
                :disabled="!isMe(m)"
                :aria-pressed="m.mode === mode"
                @click="pickMode(m, mode)"
              >
                {{ labels[mode] }}
              </button>
            </div>

            <div class="time">
              <template v-if="m.mode && m.travel_mins != null">
                <div class="mins">{{ m.travel_mins }} min</div>
                <div class="cost">${{ Number(m.travel_cost).toFixed(2) }} one way</div>
              </template>
              <div v-else-if="isMe(m)" class="cost">Pick your mode</div>
              <div v-else class="cost">Waiting for {{ m.display_name }}</div>
            </div>
          </div>
        </div>

        <!-- Right column: travel-time bars and candidate areas go here later -->
        <div v-if="stats" class="col-lg-4">
          <!-- Travel time bars -->
          <div class="panel">
            <h2 class="panel-title">Travel time to {{ ranked[0]?.name }} MRT</h2>
            <p class="panel-sub">
              The fairest MRT station near the middle of everyone's starting points
            </p>

            <div v-for="m in store.members" :key="m.user_id" class="bar-row">
              <span class="bar-name">{{ m.display_name }}</span>
              <div class="bar-track">
                <div class="bar-fill" :style="{ width: barWidth(m.travel_mins), background: m.avatar_color }"></div>
              </div>
              <span class="bar-mins">{{ m.travel_mins }} min</span>
            </div>

            <div class="chips">
              <span class="chip">Longest {{ stats.longest }} min</span>
              <span class="chip">Shortest {{ stats.shortest }} min</span>
              <span class="chip chip-good">Gap {{ stats.gap }} min<template v-if="stats.gap <= 15"> ·
                  fair</template></span>
            </div>
          </div>

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

/* One white rounded card per person */
.person {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--fp-surface);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
  padding: 0.85rem 1.25rem;
  margin-bottom: 0.75rem;
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

.who {
  width: 150px;
}

.name {
  font-weight: 700;
}

.from,
.cost {
  color: var(--fp-muted);
  font-size: 0.8rem;
}

/* The grey pill holding MRT / Bus / Car / Walk */
.segmented {
  display: flex;
  background: var(--fp-bg);
  border-radius: var(--fp-radius-sm);
  padding: 4px;
}

.segmented button {
  border: 0;
  background: transparent;
  color: var(--fp-muted);
  font-size: 0.85rem;
  padding: 0.3rem 0.8rem;
  border-radius: 8px;
}

/* The selected mode is a white raised pill */
.segmented button.active {
  background: var(--fp-surface);
  color: var(--fp-ink);
  font-weight: 700;
  box-shadow: var(--fp-shadow);
}

/* Friends' rows: you can see what they picked, but can't click it */
.segmented--readonly button {
  cursor: default;
}

.segmented--readonly button:not(.active) {
  opacity: 0.45;
}

/* Time and cost pushed to the right edge */
.time {
  margin-left: auto;
  text-align: right;
}

.mins {
  font-weight: 800;
}

.panel {
  background: var(--fp-surface);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
  padding: 1.25rem;
  margin-bottom: 1rem;
}

.panel-title {
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: 0.15rem;
}

.panel-sub {
  color: var(--fp-muted);
  font-size: 0.8rem;
  margin-bottom: 0.75rem;
}

/* name | bar | minutes */
.bar-row {
  display: grid;
  grid-template-columns: 60px 1fr 55px;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
  font-size: 0.85rem;
}

.bar-track {
  height: 8px;
  background: var(--fp-bg);
  border-radius: 99px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 99px;
  transition: width 0.3s;
  /* bar slides when the mode changes */
}

.bar-mins {
  font-weight: 700;
  text-align: right;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  border-top: 1px solid var(--fp-border);
  padding-top: 0.75rem;
  margin-top: 0.75rem;
}

.chip {
  background: var(--fp-bg);
  border-radius: 99px;
  padding: 0.3rem 0.7rem;
  font-size: 0.78rem;
  font-weight: 600;
}

.chip-good,
.area-best {
  background: color-mix(in srgb, var(--fp-primary) 12%, var(--fp-surface));
}

.chip-good {
  color: var(--fp-primary);
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
</style>