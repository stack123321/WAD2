<script setup>
// Owner: Ryan
// the main button on a friend's row: add them to a hangout I'm planning, or start a new one with them.
// Usage: <AddToHangout :friend="f" :hangouts="openHangouts" @add="addToHangout" />
// hangouts = upcoming hangouts I host that are still collecting starting points
import { computed } from 'vue'
import { shortDate } from '@/utils/dates'

const props = defineProps({
  friend: { type: Object, required: true }, // needs user_id, display_name
  hangouts: { type: Array, required: true }, // each needs id, name, starts_at, members
})

const emit = defineEmits(['add'])

// the hangouts they aren't in yet
const choices = computed(() =>
  props.hangouts.filter((h) => !h.members.some((m) => m.user_id === props.friend.user_id)),
)
</script>

<template>
  <!-- nothing to add them to: go straight to a new hangout with them, like before -->
  <router-link
    v-if="choices.length === 0"
    :to="{ name: 'create-hangout', query: { with: friend.user_id } }"
    class="btn btn-primary btn-sm text-nowrap"
    :aria-label="`Add ${friend.display_name} to hangout`"
  >
    Add to hangout
  </router-link>

  <div v-else class="dropdown">
    <button
      type="button"
      class="btn btn-primary btn-sm dropdown-toggle text-nowrap"
      data-bs-toggle="dropdown"
      aria-expanded="false"
      :aria-label="`Add ${friend.display_name} to hangout`"
    >
      Add to hangout
    </button>
    <ul class="dropdown-menu dropdown-menu-end">
      <li v-for="h in choices" :key="h.id">
        <button type="button" class="dropdown-item" @click="emit('add', friend, h)">
          {{ h.name }}
          <span class="text-secondary small">· {{ shortDate(new Date(h.starts_at)) }}</span>
        </button>
      </li>
      <li><hr class="dropdown-divider" /></li>
      <li>
        <router-link
          class="dropdown-item"
          :to="{ name: 'create-hangout', query: { with: friend.user_id } }"
        >
          New hangout with {{ friend.display_name }}
        </router-link>
      </li>
    </ul>
  </div>
</template>
