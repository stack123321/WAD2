<script setup>
// Owner: Eashvar. The shortlisted spots on 11 Group voting, one CandidateCard each.
import CandidateCard from './CandidateCard.vue'

defineProps({
  shortlist: { type: Array, required: true },
  counts: { type: Object, required: true }, // { [spotId]: number of votes }
  myVoteId: { type: String, default: null },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['vote'])
</script>

<template>
  <p v-if="shortlist.length === 0" class="empty small mb-0">
    Nothing has been shortlisted yet. Add spots from the nearby spots page first.
  </p>
  <ul v-else class="list-unstyled row g-3 mb-0">
    <li v-for="spot in shortlist" :key="spot.id" class="col-12">
      <CandidateCard
        :spot="spot"
        :count="counts[spot.id] ?? 0"
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
