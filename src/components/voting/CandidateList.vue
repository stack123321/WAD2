<script setup>
// Owner: Eashvar. The shortlisted spots on 11 Group voting, one CandidateCard each, with each
// spot's vote count and voters looked up by spot id. Passes each card's vote(spotId) up.
import CandidateCard from './CandidateCard.vue'

defineProps({
  shortlist: { type: Array, required: true },
  counts: { type: Object, required: true },
  votersBySpot: { type: Object, required: true },
  totalVotes: { type: Number, required: true },
  leaderId: { type: String, default: null },
  tied: { type: Boolean, default: false },
  myVoteId: { type: String, default: null },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['vote'])
</script>

<template>
  <p v-if="shortlist.length === 0" class="empty small mb-0">
    Nothing has been shortlisted yet. Add spots from the nearby spots page first.
  </p>
  <ul v-else class="list-unstyled d-flex flex-column gap-3 mb-0">
    <li v-for="spot in shortlist" :key="spot.id">
      <CandidateCard
        :spot="spot"
        :count="counts[spot.id] ?? 0"
        :total-votes="totalVotes"
        :voters="votersBySpot[spot.id] ?? []"
        :leading="spot.id === leaderId"
        :tied="tied"
        :selected="spot.id === myVoteId"
        :disabled="disabled"
        @vote="emit('vote', $event)"
      />
    </li>
  </ul>
</template>

<style scoped>
.empty {
  color: var(--fp-muted);
}
</style>
