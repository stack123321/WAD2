<script setup>
// Owner: Nicole. Panel on 07 Mode of transport: one bar per person showing their travel time
// to the fairest MRT station.
const props = defineProps({
  members: { type: Array, required: true },
  stationName: { type: String, default: '' },
  longest: { type: Number, required: true },
})

// Bar length as a percentage; the full bar represents at least 40 minutes
function barWidth(mins) {
  const scale = Math.max(40, props.longest)
  return (mins / scale) * 100 + '%'
}
</script>

<template>
  <div class="panel">
    <h2 class="panel-title">Travel time to {{ stationName }} MRT</h2>
    <p class="panel-sub">
      The fairest MRT station near the middle of everyone's starting points
    </p>

    <div v-for="m in members" :key="m.user_id" class="bar-row">
      <span class="bar-name">{{ m.display_name }}</span>
      <div class="bar-track">
        <div class="bar-fill" :style="{ width: barWidth(m.travel_mins), background: m.avatar_color }"></div>
      </div>
      <span class="bar-mins">{{ m.travel_mins }} min</span>
    </div>
  </div>
</template>

<style scoped>
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
</style>
