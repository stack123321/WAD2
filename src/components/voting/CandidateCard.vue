<script setup>
// Owner: Eashvar. One shortlisted spot on 11 Group voting: its rank, photo (or a tinted tile with
// its initial), name, category, rating, price and match %, its live tally (bar, votes and % of votes
// cast, avatars of who voted for it), and a vote button: a grey "Vote" pill, a teal "Your vote" when
// it's my choice, "Saving…" while this vote is being saved. The leader sits on the teal tint with a
// black "Leading" badge (or "Tied" for every spot tied at the top). Emits vote(spotId).
import { computed } from 'vue'
import MemberAvatar from './MemberAvatar.vue'

const props = defineProps({
  spot: { type: Object, required: true },
  rank: { type: Number, default: 1 },
  count: { type: Number, default: 0 },
  totalVotes: { type: Number, default: 0 },
  voters: { type: Array, default: () => [] },
  leading: { type: Boolean, default: false },
  tied: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['vote'])

const price = computed(() => (props.spot.price_level ? '$'.repeat(props.spot.price_level) : null))
const percent = computed(() =>
  props.totalVotes === 0 ? 0 : Math.round((props.count / props.totalVotes) * 100),
)
const voterNames = computed(() => props.voters.map((v) => v.name).join(', '))
const ahead = computed(() => props.leading || props.tied)
</script>

<template>
  <article
    class="candidate"
    :class="{ 'candidate--ahead': ahead }"
    :aria-labelledby="`spot-${spot.id}`"
  >
    <span class="rank fp-num" aria-hidden="true">{{ rank }}</span>
    <img v-if="spot.image_url" class="thumb" :src="spot.image_url" :alt="`Photo of ${spot.name}`" />
    <span v-else class="thumb thumb--empty" aria-hidden="true">{{ spot.name.charAt(0) }}</span>

    <div class="body">
      <div class="title-row">
        <h3 :id="`spot-${spot.id}`" class="name">{{ spot.name }}</h3>
        <span v-if="ahead" class="badge leading">{{ tied ? 'Tied' : 'Leading' }}</span>
      </div>

      <p class="meta">
        <span class="text-capitalize">{{ spot.category }}</span>
        <template v-if="spot.rating">
          ·
          <svg
            class="star"
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path
              d="M3.6 15.3c-.4.2-.8-.2-.7-.6l.8-4.7L.3 6.7c-.3-.3-.2-.9.3-.9l4.7-.7L7.4.8c.2-.4.8-.4 1 0l2.1 4.3 4.7.7c.5 0 .6.6.3.9l-3.4 3.3.8 4.7c.1.4-.3.8-.7.6L8 13.1z"
            /></svg
          ><span class="visually-hidden">Rating</span>
          {{ spot.rating }}
        </template>
        <template v-if="price">
          · <span aria-hidden="true">{{ price }}</span>
          <span class="visually-hidden">Price level {{ spot.price_level }} of 4</span>
        </template>
        <template v-if="spot.match_pct != null"> · {{ spot.match_pct }}% match</template>
      </p>

      <div class="tally-row">
        <div
          class="bar"
          role="progressbar"
          :aria-label="spot.name"
          :aria-valuenow="count"
          aria-valuemin="0"
          :aria-valuemax="totalVotes"
          :aria-valuetext="`${count} ${count === 1 ? 'vote' : 'votes'}, ${percent}%`"
        >
          <span class="bar-fill fp-grow" :style="{ width: percent + '%' }"></span>
        </div>
        <span class="votes">{{ count }} {{ count === 1 ? 'vote' : 'votes' }} · {{ percent }}%</span>
        <span v-if="voters.length" class="voters">
          <MemberAvatar
            v-for="voter in voters"
            :key="voter.userId"
            :name="voter.name"
            :color="voter.color"
            :size="26"
          />
          <span class="visually-hidden">Voted for this: {{ voterNames }}</span>
        </span>
      </div>
    </div>

    <button
      type="button"
      class="btn vote-btn"
      :class="selected ? 'btn-brand' : 'btn-secondary'"
      :aria-label="`Vote for ${spot.name}`"
      :aria-pressed="selected"
      :aria-busy="saving"
      :disabled="disabled"
      @click="emit('vote', spot.id)"
    >
      <span v-if="saving" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
      <svg
        v-else-if="selected"
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke="currentColor"
          stroke-width="2.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      {{ saving ? 'Saving…' : selected ? 'Your vote' : 'Vote' }}
    </button>
  </article>
</template>

<style scoped>
.candidate {
  display: grid;
  grid-template-columns: 36px 64px minmax(0, 1fr) auto;
  align-items: center;
  gap: 1rem 1.35rem;
  padding: 1.35rem 1.5rem;
  background: var(--fp-surface);
  border: 2px solid transparent;
  border-radius: var(--fp-radius);
}

/* The spot in front sits on the teal tint, outlined in teal */
.candidate--ahead {
  background: var(--fp-tint);
  border-color: var(--fp-primary);
}

.rank {
  font-family: var(--fp-display);
  font-weight: 900;
  font-size: 2.75rem;
  line-height: 1;
  color: var(--fp-chip-line);
}

.candidate--ahead .rank {
  color: var(--fp-primary);
}

.thumb {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  object-fit: cover;
}

.thumb--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--fp-pill);
  color: var(--fp-muted);
  font-family: var(--fp-display);
  font-weight: 800;
  font-size: 1.75rem;
}

.candidate--ahead .thumb--empty {
  background: var(--fp-bg);
  color: var(--fp-primary);
}

.body {
  min-width: 0;
}

.title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
}

.name {
  margin: 0;
  font-size: 1.5rem;
  line-height: 1.2;
}

.leading {
  background: var(--fp-ink);
  color: var(--fp-bg);
  font-size: 0.75rem;
}

.star {
  vertical-align: -1px;
}

.meta {
  margin: 0.15rem 0 0;
  color: var(--fp-muted);
  font-size: 0.9rem;
}

.tally-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.bar {
  flex: 1;
  height: 10px;
  border-radius: var(--fp-radius-pill);
  background: var(--fp-pill);
  overflow: hidden;
}

.bar-fill {
  display: block;
  height: 100%;
  border-radius: var(--fp-radius-pill);
  background: var(--fp-ink);
}

.candidate--ahead .bar-fill {
  background: var(--fp-primary);
}

.votes {
  font-size: 0.875rem;
  font-weight: 700;
  white-space: nowrap;
}

.voters {
  display: flex;
  padding-left: 6px;
}

.voters > * {
  margin-left: -6px;
}

.vote-btn {
  min-height: 48px;
  min-width: 7rem;
}

/* Phones: rank and photo on the first row, the vote button full width underneath */
@media (max-width: 575.98px) {
  .candidate {
    grid-template-columns: 28px minmax(0, 1fr);
    gap: 0.75rem 0.9rem;
    padding: 1.1rem;
  }

  /* the name needs the width more than the photo does */
  .thumb {
    display: none;
  }

  .rank {
    font-size: 2rem;
  }

  .tally-row {
    flex-wrap: wrap;
  }

  .vote-btn {
    grid-column: 1 / -1;
    width: 100%;
  }
}
</style>
