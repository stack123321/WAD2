<script setup>
// Owner: Ryan
// the next 7 days at a glance, for the right-hand column of 04 dashboard: a dot per hangout
// (● confirmed, ◆ needs you, ○ still planning) and the first free day
import { computed } from 'vue'
import { sgDate, shortDate } from '@/utils/dates'
import { getStatus } from '@/utils/hangoutStatus'

const props = defineProps({
  hangouts: { type: Array, required: true }, // the upcoming hangouts
  myId: { type: String, default: null },
})

const DAY = 24 * 60 * 60 * 1000 // Singapore has no daylight saving, so +24 hours is always the next day
const SG = 'Asia/Singapore'

function dotOf(h) {
  if (h.status === 'confirmed') return 'confirmed'
  return getStatus(h, props.myId).needsYou ? 'needs' : 'planning'
}

// [{ key, date, weekday: 'THU', number: '22', today, dots: ['confirmed', 'needs'], count }]
const days = computed(() => {
  const now = Date.now()
  const result = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(now + i * DAY)
    const key = sgDate(date)
    const onThisDay = props.hangouts.filter(
      (h) => h.starts_at && sgDate(new Date(h.starts_at)) === key,
    )
    result.push({
      key,
      date,
      weekday: date.toLocaleDateString('en-SG', { weekday: 'short', timeZone: SG }).toUpperCase(),
      number: date.toLocaleDateString('en-SG', { day: 'numeric', timeZone: SG }),
      today: i === 0,
      dots: onThisDay.slice(0, 3).map(dotOf),
      count: onThisDay.length,
    })
  }
  return result
})

// "22 Oct – 28 Oct"
const range = computed(() => {
  const label = (d) =>
    `${d.number} ${d.date.toLocaleDateString('en-SG', { month: 'short', timeZone: SG })}`
  return `${label(days.value[0])} – ${label(days.value[6])}`
})

// the first day from tomorrow with nothing on
const freeDay = computed(() => days.value.slice(1).find((d) => d.count === 0) ?? null)

function summary(count) {
  if (count === 0) return 'nothing on'
  return count === 1 ? '1 hangout' : `${count} hangouts`
}
</script>

<template>
  <section class="card week p-3">
    <h2 class="week-head">
      <span>Next 7 days</span>
      <span class="range">{{ range }}</span>
    </h2>
    <ol class="days">
      <li
        v-for="d in days"
        :key="d.key"
        class="day"
        :class="{ today: d.today, open: d === freeDay }"
      >
        <span class="wd">{{ d.weekday }}</span>
        <strong>{{ d.number }}</strong>
        <span class="dots" aria-hidden="true">
          <i v-for="(dot, i) in d.dots" :key="i" :class="dot"></i>
        </span>
        <span class="visually-hidden">{{ summary(d.count) }}</span>
      </li>
    </ol>
    <p class="legend" aria-hidden="true">
      <span><i class="confirmed"></i>Confirmed</span>
      <span><i class="needs"></i>Needs you</span>
      <span><i class="planning"></i>Planning</span>
    </p>
    <p v-if="freeDay" class="free">
      <span>
        <strong>{{ shortDate(freeDay.date) }}</strong> is free.
      </span>
      <router-link :to="{ name: 'create-hangout', query: { date: freeDay.key } }">
        Plan something →
      </router-link>
    </p>
  </section>
</template>

<style scoped>
.week-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
}
.range {
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--fp-muted);
}
.days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin: 0.75rem 0 0;
  padding: 0;
  list-style: none;
  text-align: center;
}
.day {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.375rem 0 0.5rem;
  border: 1px solid transparent;
  border-radius: 8px;
}
.wd {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--fp-muted);
}
.day strong {
  font-size: 1rem;
}
.day.today {
  background: var(--fp-primary);
  color: #fff;
}
.day.today .wd {
  color: #fff;
}
.day.open {
  border: 1px dashed var(--fp-primary);
}
.dots {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 8px;
  margin-top: 4px;
}
.dots i,
.legend i {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.confirmed {
  background: var(--fp-primary);
}
.needs {
  background: #a16207;
  border-radius: 1px;
  transform: rotate(45deg);
}
.planning {
  box-sizing: border-box;
  border: 1.5px solid var(--fp-muted);
}
.today .confirmed,
.today .needs {
  background: #fff;
}
.today .planning {
  border-color: #fff;
}
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 0.75rem 0 0;
  font-size: 0.75rem;
  color: var(--fp-muted);
}
.legend i {
  margin-right: 0.3rem;
}
.free {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin: 0.875rem 0 0;
  padding-top: 0.5rem;
  border-top: 1px solid var(--bs-border-color);
  font-size: 0.875rem;
}
.free a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  color: var(--fp-primary);
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}
</style>
