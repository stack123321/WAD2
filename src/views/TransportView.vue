   <script setup>
  // 07 Mode of transport
  // Owner: Nicole · Vet by: Surya
  import { computed, onMounted, ref, watch } from 'vue'
  import { fairness, rankAreas, CANDIDATE_AREAS } from '@/utils/midpoint'
  import { useRoute } from 'vue-router'
  import { useHangoutStore } from '@/stores/hangout'
  import { getRoute } from '@/services/routing'

  const route = useRoute()
  const optimiseFor = ref('fairest')
  const ranked = ref([])
  const store = useHangoutStore()
  const modes = ['mrt', 'bus', 'car', 'walk']
  const labels = { mrt: 'MRT', bus: 'Bus', car: 'Car', walk: 'Walk' }
  const missingMode = computed(() => store.members.filter((m) => !m.mode))
  const allPicked = computed(() => store.members.length > 0 && missingMode.value.length === 0)



  async function scoreAreas() {
    const members = store.members.filter((m) => m.mode)
    if (members.length === 0) return

    // Travel time for every person to every candidate area
    const candidates = await Promise.all(
      CANDIDATE_AREAS.map(async (area) => {
        const routes = await Promise.all(
          members.map((m) => getRoute({ lat: m.start_lat, lng: m.start_lng }, area, m.mode)),
        )
        return { ...area, travelMins: routes.map((r) => r.mins), travelCosts: routes.map((r) => r.cost) }
      }),
    )
    ranked.value = rankAreas(candidates, optimiseFor.value)

    const best = ranked.value[0]
    members.forEach((m, i) => {
      m.travel_mins = best.travelMins[i]
      m.travel_cost = best.travelCosts[i]
    })
  }

  async function pickMode(m, mode) {
    m.mode = mode
    try {
      await scoreAreas()
    } catch (e) {
      console.error('Could not get travel times', e)
    }
  }


  onMounted(async () => {
    await store.load(route.params.id)
    await scoreAreas()
  })
  watch(optimiseFor, scoreAreas)

  // Longest, shortest and gap across everyone's current travel times
  const stats = computed(() => {
    if (store.members.length === 0) return null
    const f = fairness(store.members.map((m) => m.travel_mins))
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
      <p class="subtitle">Pick a mode for each person. We compare real travel times, not straight-line distance.</p>

      <div class="row g-4">
        <!-- Left column: one row per person -->
        <div class="col-lg-8">
          <div v-for="m in store.members" :key="m.user_id" class="person">
            <span class="avatar" :style="{ background: m.avatar_color }">
              {{ m.display_name[0] }}
            </span>

            <div class="who">
              <div class="name">{{ m.display_name }}</div>
              <div class="from">From {{ m.start_label }}</div>
            </div>

            <div class="segmented">
              <button v-for="mode in modes" :key="mode" :class="{ active: m.mode === mode }" @click="pickMode(m, mode)">
                {{ labels[mode] }}
              </button>
            </div>

            <div class="time">
              <template v-if="m.mode">
                <div class="mins">{{ m.travel_mins }} min</div>
                <div class="cost">${{ m.travel_cost.toFixed(2) }} one way</div>
              </template>
              <div v-else class="cost">Pick a mode</div>
            </div>
          </div>
        </div>

        <!-- Right column: travel-time bars and candidate areas go here later -->
        <div v-if="stats" class="col-lg-4">
          <!-- Travel time bars -->
          <div class="panel">
            <h2 class="panel-title">Travel time to {{ ranked[0]?.name }}</h2>
            <p class="panel-sub">Best candidate area so far</p>

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

          <!-- Candidate areas -->
          <div class="panel">
            <h2 class="panel-title">Candidate areas</h2>
            <div class="area-row area-head">
              <span>Area</span><span>Avg time</span><span>Gap</span>
            </div>
            <div v-for="(a, i) in ranked.slice(0, 3)" :key="a.name" class="area-row" :class="{ 'area-best': i === 0 }">
              <span><strong>{{ a.name }}</strong> <span v-if="i === 0" class="badge-best">Best</span></span>
              <span>{{ a.average }} min</span>
              <span>{{ a.gap }} min</span>
            </div>
          </div>

          <RouterLink v-if="allPicked" class="btn btn-primary btn-lg w-100"
            :to="{ name: 'midpoint', params: { id: route.params.id } }">
            Find our midpoint →
          </RouterLink>
          <template v-else>
            <button class="btn btn-primary btn-lg w-100" disabled>Find our midpoint →</button>
            <p class="footnote">
              Waiting for {{missingMode.map((m) => m.display_name).join(', ')}} to pick a mode
            </p>
          </template>
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