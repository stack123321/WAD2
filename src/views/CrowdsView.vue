<script setup>
// Owner: Ryan
// crowd heat map for all of singapore, from "crowds right now" on 04 (same map as 08, no midpoint)
// (Eashvar, design catalogue A1) beside the map, a list reads the same levels out: the busiest and
// quietest stations at the slider's time, so it works without the map and with a screen reader
import { computed, ref } from 'vue'
import CrowdHeatmap from '@/components/heatmap/CrowdHeatmap.vue'
import PageBand from '@/components/ui/PageBand.vue'

const LEVELS = { h: 'High', m: 'Moderate', l: 'Low' }
const RANK = { h: 3, m: 2, l: 1 }

const stations = ref([])
const time = ref('')

function onLevels(e) {
  stations.value = e.stations
  time.value = e.time
}

// highest level first (then by name), the first 5
const busiest = computed(() =>
  [...stations.value]
    .filter((s) => s.level !== 'l')
    .sort((a, b) => RANK[b.level] - RANK[a.level] || a.station.localeCompare(b.station))
    .slice(0, 5),
)
const quietest = computed(() =>
  stations.value
    .filter((s) => s.level === 'l')
    .sort((a, b) => a.station.localeCompare(b.station))
    .slice(0, 5),
)
</script>

<template>
  <main>
    <PageBand
      title="Crowds at MRT stations"
      lead="Move the slider to see how busy each station gets today. Tap or hover over a circle for its name."
      :back="{ to: { name: 'dashboard' }, label: 'My hangouts' }"
    />
    <div class="container fp-pull">
      <div class="row g-4">
        <div class="col-12 col-lg-8">
          <CrowdHeatmap @levels="onLevels" />
        </div>
        <div v-if="stations.length" class="col-12 col-lg-4 d-flex flex-column gap-4">
          <section class="panel" aria-labelledby="busy-heading">
            <h2 id="busy-heading" class="panel-title">Busiest at {{ time }}</h2>
            <ul class="levels">
              <li v-for="s in busiest" :key="s.station">
                <span class="dot" :class="`dot--${s.level}`" aria-hidden="true"></span>
                <span class="levels__name">{{ s.station }}</span>
                <span class="levels__level">{{ LEVELS[s.level] }}</span>
              </li>
              <li v-if="!busiest.length" class="text-secondary">Nowhere is busy right now.</li>
            </ul>
          </section>
          <section class="panel" aria-labelledby="quiet-heading">
            <h2 id="quiet-heading" class="panel-title">Quietest at {{ time }}</h2>
            <ul class="levels">
              <li v-for="s in quietest" :key="s.station">
                <span class="dot dot--l" aria-hidden="true"></span>
                <span class="levels__name">{{ s.station }}</span>
                <span class="levels__level">Low</span>
              </li>
              <li v-if="!quietest.length" class="text-secondary">No station is quiet right now.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.panel {
  padding: 1.25rem;
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
  background: var(--fp-surface);
  box-shadow: var(--fp-shadow);
}

.panel-title {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
  font-weight: 700;
}

.levels {
  margin: 0;
  padding: 0;
  list-style: none;
}

.levels li {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.75rem;
  min-height: 44px;
}

.levels li + li {
  border-top: 1px solid var(--fp-border);
}

.levels__name {
  font-weight: 700;
}

.levels__level {
  color: var(--fp-muted);
  font-size: 0.9rem;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

/* the same colours as the map's circles */
.dot--h {
  background: var(--bs-danger);
}

.dot--m {
  background: var(--bs-warning);
}

.dot--l {
  background: var(--bs-success);
}
</style>
