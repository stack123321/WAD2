<script setup>
// Owner: Ryan
// the hangouts waiting on you, each with its one button, under the week in the right-hand column of 04 dashboard
import { computed } from 'vue'
import { shortDate } from '@/utils/dates'
import { getStatus } from '@/utils/hangoutStatus'

const props = defineProps({
  hangouts: { type: Array, required: true }, // the upcoming hangouts
  myId: { type: String, default: null },
})

const MAX = 3
const items = computed(() =>
  props.hangouts
    .map((h) => ({ hangout: h, status: getStatus(h, props.myId) }))
    .filter((x) => x.status.needsYou),
)

// "Fri 23 Oct", or "No date yet"
function whenOf(h) {
  return h.starts_at ? shortDate(new Date(h.starts_at)) : 'No date yet'
}
</script>

<template>
  <section v-if="items.length > 0" class="card p-3">
    <h2 class="head">
      Needs your input <span class="count">{{ items.length }}</span>
    </h2>
    <div v-for="x in items.slice(0, MAX)" :key="x.hangout.id" class="item">
      <div class="text">
        <p class="name">{{ x.hangout.name }}</p>
        <p class="when">{{ whenOf(x.hangout) }}</p>
      </div>
      <router-link :to="{ name: x.status.page, params: { id: x.hangout.id } }" class="open">
        {{ x.status.button }} →
      </router-link>
    </div>
    <p v-if="items.length > MAX" class="more">and {{ items.length - MAX }} more in the list</p>
  </section>
</template>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
}
.count {
  padding: 0.1rem 0.55rem;
  border-radius: 999px;
  background: var(--bs-warning-bg-subtle);
  color: var(--bs-warning-text-emphasis);
  font-size: 0.75rem;
}
.item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.625rem;
  margin-top: 0.625rem;
  padding-top: 0.625rem;
  border-top: 1px solid var(--bs-border-color);
}
.open {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  color: var(--fp-primary);
  font-size: 0.8125rem;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}
.text {
  min-width: 0;
}
.name {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.when {
  margin: 0;
  font-size: 0.75rem;
  color: var(--fp-muted);
}
.more {
  margin: 0.625rem 0 0;
  font-size: 0.75rem;
  color: var(--fp-muted);
}
</style>
