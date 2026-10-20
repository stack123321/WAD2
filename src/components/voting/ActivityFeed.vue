<script setup>
// Owner: Eashvar. "What's happening" on 11 Group voting: who voted, changed or removed their vote,
// newest first, with an avatar and the time in SGT (date included if it wasn't today).
// The database keeps only each person's latest vote, so changes are listed only while the page is open.
import MemberAvatar from './MemberAvatar.vue'
import { formatDateTime, formatTime, isSameSgtDay } from './voteHelpers'

defineProps({
  items: { type: Array, required: true },
})

function when(iso) {
  return isSameSgtDay(iso, new Date().toISOString()) ? formatTime(iso) : formatDateTime(iso)
}
</script>

<template>
  <section class="feed" aria-labelledby="feed-heading">
    <h2 id="feed-heading" class="feed-title">What's happening</h2>
    <p v-if="items.length === 0" class="muted mb-0">No votes yet.</p>
    <ol v-else class="feed-list" aria-live="polite">
      <li v-for="item in items" :key="item.id" class="feed-item">
        <MemberAvatar :name="item.displayName" :color="item.color" :size="30" />
        <p class="mb-0">
          <strong>{{ item.name }}</strong>
          <template v-if="item.kind === 'voted'"> voted for {{ item.toName }}</template>
          <template v-else-if="item.kind === 'changed'">
            changed {{ item.isMe ? 'your' : 'their' }} vote to {{ item.toName }} (was
            {{ item.fromName }})
          </template>
          <template v-else> removed {{ item.isMe ? 'your' : 'their' }} vote</template>
          <span class="when">
            · <time :datetime="item.at">{{ when(item.at) }}</time></span
          >
        </p>
      </li>
    </ol>
    <p class="feed-note">Vote changes are only listed while this page is open.</p>
  </section>
</template>

<style scoped>
.feed {
  padding: 1.6rem;
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
}

.feed-title {
  margin: 0 0 0.9rem;
  font-size: 1.375rem;
}

.feed-list {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.feed-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  font-size: 0.95rem;
  line-height: 1.4;
}

.when {
  color: var(--fp-faint);
}

.muted {
  color: var(--fp-muted);
}

.feed-note {
  margin: 1rem 0 0;
  color: var(--fp-faint);
  font-size: 0.85rem;
}
</style>
