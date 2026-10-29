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
// some() is true if any member is this friend, and ! flips it to keep only the hangouts without them.
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

  <!-- some to choose from: a menu of them, plus a new hangout at the bottom -->
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
        <!-- sends the friend and the hangout up to the friends page, which saves it -->
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

<style scoped>
/* 44px tall like the Chat button beside it, with the label in the middle */
.btn {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* from 576px the plain link and the dropdown with its caret are the same width (on phones there is no room) */
@media (min-width: 576px) {
  .btn {
    min-width: 9rem;
  }
}

/* each menu row is 44px tall too, so it's easy to tap */
.dropdown-item {
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 0.35rem; /* the space between the hangout name and its date */
}
</style>
