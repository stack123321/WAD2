<script setup>
// Owner: Eashvar. One shortlisted spot on 11 Group voting: photo, name, category, rating,
// price and match %, its live tally (bar, votes and % of votes cast, avatars of who voted for it),
// and a vote button that shows "✓ Your vote" when it's my choice. Emits vote(spotId).
import { computed } from 'vue'
import MemberAvatar from './MemberAvatar.vue'

const props = defineProps({
  spot: { type: Object, required: true },
  count: { type: Number, default: 0 },
  totalVotes: { type: Number, default: 0 },
  voters: { type: Array, default: () => [] },
  leading: { type: Boolean, default: false },
  tied: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['vote'])

const price = computed(() => (props.spot.price_level ? '$'.repeat(props.spot.price_level) : null))
const percent = computed(() =>
  props.totalVotes === 0 ? 0 : Math.round((props.count / props.totalVotes) * 100),
)
const voterNames = computed(() => props.voters.map((v) => v.name).join(', '))
</script>

<template>
  <article
    class="candidate d-flex flex-wrap align-items-center gap-3"
    :class="{ 'candidate--selected': selected }"
    :aria-labelledby="`spot-${spot.id}`"
  >
    <img v-if="spot.image_url" class="thumb" :src="spot.image_url" :alt="`Photo of ${spot.name}`" />
    <div v-else class="thumb thumb--empty" aria-hidden="true">{{ spot.name.charAt(0) }}</div>

    <div class="body">
      <div class="d-flex flex-wrap align-items-center gap-2 mb-1">
        <h3 :id="`spot-${spot.id}`" class="name h6 mb-0">{{ spot.name }}</h3>
        <span v-if="leading" class="badge leading">{{
          tied ? 'Tied · best match' : 'Leading'
        }}</span>
      </div>

      <p class="meta small mb-2">
        <span class="text-capitalize">{{ spot.category }}</span>
        <template v-if="spot.rating">
          · <span aria-hidden="true">★</span><span class="visually-hidden">Rating</span>
          {{ spot.rating }}
        </template>
        <template v-if="price">
          · <span aria-hidden="true">{{ price }}</span>
          <span class="visually-hidden">Price level {{ spot.price_level }} of 4</span>
        </template>
        <template v-if="spot.match_pct != null"> · {{ spot.match_pct }}% match</template>
      </p>

      <div class="d-flex align-items-center gap-2">
        <div
          class="progress flex-grow-1"
          role="progressbar"
          :aria-label="spot.name"
          :aria-valuenow="count"
          aria-valuemin="0"
          :aria-valuemax="totalVotes"
          :aria-valuetext="`${count} ${count === 1 ? 'vote' : 'votes'}, ${percent}%`"
        >
          <div
            class="progress-bar"
            :class="{ 'progress-bar--leading': leading }"
            :style="{ width: percent + '%' }"
          ></div>
        </div>
        <span class="small fw-semibold text-nowrap">
          {{ count }} {{ count === 1 ? 'vote' : 'votes' }} · {{ percent }}%
        </span>
        <span v-if="voters.length" class="voters d-flex">
          <MemberAvatar
            v-for="voter in voters"
            :key="voter.userId"
            :name="voter.name"
            :color="voter.color"
            :size="22"
          />
          <span class="visually-hidden">Voted for this: {{ voterNames }}</span>
        </span>
      </div>
    </div>

    <button
      type="button"
      class="vote-btn btn btn-sm"
      :class="selected ? 'btn-primary' : 'vote-btn--idle'"
      :aria-label="`Vote for ${spot.name}`"
      :aria-pressed="selected"
      :disabled="disabled"
      @click="emit('vote', spot.id)"
    >
      {{ selected ? '✓ Your vote' : 'Vote' }}
    </button>
  </article>
</template>

<style scoped>
.candidate {
  background: var(--fp-surface);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
  box-shadow: var(--fp-shadow);
  padding: 1rem;
}

.candidate--selected {
  border-color: var(--fp-primary);
  box-shadow: 0 0 0 1px var(--fp-primary);
}

.thumb {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border-radius: var(--fp-radius-sm);
  object-fit: cover;
}

.thumb--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--fp-bg);
  border: 1px solid var(--fp-border);
  color: var(--fp-muted);
  font-size: 1.5rem;
  font-weight: 700;
}

.body {
  flex: 1 1 13rem;
  min-width: 0;
}

.name {
  font-weight: 700;
}

.leading {
  background: var(--fp-bg);
  color: var(--fp-primary);
  border: 1px solid var(--fp-primary);
}

.meta {
  color: var(--fp-muted);
}

.progress {
  height: 6px;
  background: var(--fp-bg);
}

.progress-bar {
  background: var(--fp-muted);
}

.progress-bar--leading {
  background: var(--fp-primary);
}

.voters > :not(:first-child) {
  margin-left: -6px;
}

.vote-btn {
  width: 100%;
  font-weight: 600;
}

.vote-btn--idle {
  --bs-btn-bg: var(--fp-surface);
  --bs-btn-color: var(--fp-ink);
  --bs-btn-border-color: var(--fp-border);
  --bs-btn-hover-bg: var(--fp-bg);
  --bs-btn-hover-color: var(--fp-ink);
  --bs-btn-hover-border-color: var(--fp-muted);
  --bs-btn-active-bg: var(--fp-bg);
  --bs-btn-active-color: var(--fp-ink);
  --bs-btn-disabled-bg: var(--fp-surface);
  --bs-btn-disabled-color: var(--fp-muted);
  --bs-btn-disabled-border-color: var(--fp-border);
}

@media (min-width: 576px) {
  .vote-btn {
    width: auto;
    min-width: 6.5rem;
  }
}
</style>
