<script setup>
defineProps({
  hangoutId: { type: String, required: true },
  step: {
    type: String,
    required: true,
    validator: (value) => ['starting-points', 'transport', 'midpoint'].includes(value),
  },
})

const notices = {
  'starting-points': {
    message: 'No starting point. Please pick where you are starting your journey',
    button: 'Back to starting points',
  },
  transport: {
    message: 'No transport. Please pick how you are travelling',
    button: 'Back to transport',
  },
  midpoint: {
    message:
      "No midpoint yet. Fairpoint finds it once everyone's starting points and travel modes are set.",
    button: 'Back to midpoint',
  },
}
</script>

<template>
  <div class="alert alert-info" role="status">
    <p class="mb-2">{{ notices[step].message }}</p>
    <RouterLink :to="{ name: step, params: { id: hangoutId } }" class="btn btn-primary btn-sm">
      {{ notices[step].button }}
    </RouterLink>
  </div>
</template>
