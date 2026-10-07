<script setup>
// Owner: Eashvar. Vote activity on 11 Group voting, newest first.
// The database keeps only each person's latest vote, so changes are listed only while the page is open.
import { formatDateTime, formatTime, isSameSgtDay } from './voteHelpers'

defineProps({
  // [{ id, kind: 'voted' | 'changed' | 'removed', isMe, name, toName, fromName, at }]
  items: { type: Array, required: true },
})

// Today's votes show just the time; older ones show the date as well
function when(iso) {
  return isSameSgtDay(iso, new Date().toISOString()) ? formatTime(iso) : formatDateTime(iso)
}
</script>

<template>
  <section class="panel" aria-labelledby="feed-heading">
    <h2 id="feed-heading" class="h5">Activity</h2>
    <p v-if="items.length === 0" class="small muted">No votes yet.</p>
    <ol v-else class="list-unstyled mb-2" aria-live="polite">
      <li v-for="item in items" :key="item.id" class="feed-item small py-2">
        <strong>{{ item.name }}</strong>
        <template v-if="item.kind === 'voted'"> voted for {{ item.toName }}</template>
        <template v-else-if="item.kind === 'changed'">
          changed {{ item.isMe ? 'your' : 'their' }} vote to {{ item.toName }} (was
          {{ item.fromName }})
        </template>
        <template v-else> removed {{ item.isMe ? 'your' : 'their' }} vote</template>
        <span class="muted">
          · <time :datetime="item.at">{{ when(item.at) }}</time></span
        >
      </li>
    </ol>
    <p class="small muted mb-0">Vote changes are only listed while this page is open.</p>
  </section>
</template>

<style scoped>
.panel {
  background: var(--fp-surface);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
  box-shadow: var(--fp-shadow);
  padding: 1.25rem;
}

.muted {
  color: var(--fp-muted);
}

.feed-item + .feed-item {
  border-top: 1px solid var(--fp-border);
}
</style>
