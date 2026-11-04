<script setup>
// Blue notice shown on a page whose earlier planning step isn't done yet.
// Usage: <MissingPrerequisite :hangout-id="id" step="starting-points" />
import { computed } from 'vue'

const props = defineProps({
  hangoutId: { type: String, required: true },
  step: { type: String, required: true }, // 'starting-points' | 'transport' | 'midpoint'
})

const steps = {
  'starting-points': {
    text: 'No starting point. Please pick where you are starting your journey',
    button: 'Back to starting points',
  },
  transport: {
    text: 'No transport. Please pick how you are travelling',
    button: 'Back to transport',
  },
  midpoint: {
    text: "No midpoint yet. Fairpoint finds it once everyone's starting points and travel modes are set.",
    button: 'Back to midpoint',
  },
}

const content = computed(() => steps[props.step])
</script>

<template>
  <div class="alert alert-info" role="status">
    <p class="mb-2">{{ content.text }}</p>
    <RouterLink
      :to="{ name: props.step, params: { id: props.hangoutId } }"
      class="btn btn-primary btn-sm"
    >
      {{ content.button }}
    </RouterLink>
  </div>
</template>
