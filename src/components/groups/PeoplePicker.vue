<script setup>
// Owner: Eashvar. Tick friends to put them in a group, with a search box once the list is long.
// Used by the New group page and "Add people" on a group's page.
// Usage: <PeoplePicker :people="friends" :picked="pickedIds" @toggle="togglePerson" />
//   people → [{ user_id, display_name, avatar_color }]; picked → the ticked user_ids
//   toggle → the user_id that was ticked or unticked (the page changes its own list)
import { computed, ref } from 'vue'
import MemberAvatar from '@/components/voting/MemberAvatar.vue'

const props = defineProps({
  people: { type: Array, required: true },
  picked: { type: Array, default: () => [] },
  idPrefix: { type: String, default: 'pick' }, // keeps the checkbox ids unique if two pickers show
})

const emit = defineEmits(['toggle'])

const SEARCH_FROM = 8 // a search box only helps once there are more names than fit on screen
const search = ref('')

const shown = computed(() => {
  const text = search.value.trim().toLowerCase()
  if (text === '') {
    return props.people
  }
  return props.people.filter((p) => p.display_name.toLowerCase().includes(text))
})
</script>

<template>
  <div>
    <div v-if="people.length > SEARCH_FROM" class="mb-2">
      <label :for="`${idPrefix}-search`" class="visually-hidden">Search your friends</label>
      <input
        :id="`${idPrefix}-search`"
        v-model="search"
        type="search"
        class="form-control picker-search"
        placeholder="Search your friends"
      />
    </div>

    <ul class="picker">
      <li v-for="p in shown" :key="p.user_id">
        <label class="pick" :for="`${idPrefix}-${p.user_id}`">
          <input
            :id="`${idPrefix}-${p.user_id}`"
            class="form-check-input mt-0"
            type="checkbox"
            :checked="picked.includes(p.user_id)"
            @change="emit('toggle', p.user_id)"
          />
          <MemberAvatar :name="p.display_name" :color="p.avatar_color" :size="32" />
          <span class="pick__name">{{ p.display_name }}</span>
        </label>
      </li>
    </ul>
    <p v-if="shown.length === 0" class="small text-muted mb-0">Nobody by that name.</p>
  </div>
</template>

<style scoped>
.picker {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 22rem;
  overflow-y: auto;
}

.pick {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 48px;
  padding: 0.25rem 0.5rem;
  border-radius: var(--fp-radius-sm);
  cursor: pointer;
}

.pick:hover {
  background: var(--fp-bg);
}

.pick .form-check-input {
  width: 1.25rem;
  height: 1.25rem;
  flex: 0 0 auto;
}

.pick__name {
  font-weight: 600;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-search {
  min-height: 44px;
}
</style>
