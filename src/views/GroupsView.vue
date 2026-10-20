<script setup>
// Owner: Surya. /groups: your friend groups (e.g. "Uni friends"), and a box to make a new one.
// Each group has its own page (GroupView, /groups/:id) with a chat that lasts across hangouts.
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { createGroup, getMyGroups } from '@/services/groups'
import { hasSupabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth'
import MemberAvatar from '@/components/voting/MemberAvatar.vue'

const auth = useAuthStore()
const router = useRouter()

const groups = ref([])
const loading = ref(true)
const error = ref('')

const newName = ref('')
const creating = ref(false)
const createError = ref('')

// Part (a) Load your groups
onMounted(async () => {
  try {
    groups.value = await getMyGroups()
  } catch (err) {
    console.error(err)
    error.value = "Couldn't load your groups."
  }
  loading.value = false
})

// Part (b) Make a group, then open its page to add friends
async function create() {
  createError.value = ''
  if (newName.value.trim() === '') {
    createError.value = 'Give the group a name.'
    return
  }
  creating.value = true
  try {
    const group = await createGroup(newName.value, auth.user.id)
    router.push({ name: 'group', params: { groupId: group.id } })
  } catch (err) {
    console.error(err)
    createError.value = err.message || "Couldn't make the group."
  }
  creating.value = false
}

// "Ryan, Nicole and 2 others"
function memberNames(group) {
  const names = []
  for (const m of group.members) {
    names.push(m.display_name)
  }
  if (names.length <= 3) {
    return names.join(', ')
  }
  return `${names.slice(0, 2).join(', ')} and ${names.length - 2} others`
}
</script>

<template>
  <main class="container py-4 groups-page">
    <router-link :to="{ name: 'dashboard' }" class="small">← My hangouts</router-link>
    <h1 class="mt-2 mb-3">Friend groups.</h1>
    <p class="text-secondary mb-3">
      One chat for each group of friends that stays across all your hangouts.
    </p>

    <p v-if="!hasSupabase" class="box text-secondary small">
      Friend groups need Supabase, so they don't work in the demo.
    </p>

    <template v-else>
      <form class="box mb-4" @submit.prevent="create">
        <label for="group-name" class="form-label fw-semibold">New group</label>
        <div class="d-flex gap-2">
          <input
            id="group-name"
            v-model="newName"
            class="form-control"
            type="text"
            maxlength="60"
            placeholder="e.g. Uni friends"
            autocomplete="off"
          />
          <button type="submit" class="btn btn-primary text-nowrap tap" :disabled="creating">
            {{ creating ? 'Making…' : 'Make group' }}
          </button>
        </div>
        <p v-if="createError" class="small text-danger mt-2 mb-0" role="alert">
          {{ createError }}
        </p>
      </form>

      <p v-if="loading" class="text-secondary">Loading your groups…</p>
      <p v-else-if="error" class="text-danger" role="alert">{{ error }}</p>
      <p v-else-if="groups.length === 0" class="text-secondary">
        No groups yet. Make one above, then add your friends.
      </p>

      <ul v-else class="list-unstyled d-grid gap-2 mb-0">
        <li v-for="g in groups" :key="g.id">
          <router-link :to="{ name: 'group', params: { groupId: g.id } }" class="box group-card">
            <span class="avatar-stack">
              <MemberAvatar
                v-for="m in g.members.slice(0, 4)"
                :key="m.user_id"
                :name="m.display_name"
                :color="m.avatar_color"
                :size="32"
              />
            </span>
            <span class="min-w-0">
              <span class="d-block fw-bold text-truncate">{{ g.name }}</span>
              <span class="d-block small text-secondary text-truncate">{{ memberNames(g) }}</span>
            </span>
            <span class="ms-auto text-secondary" aria-hidden="true">›</span>
          </router-link>
        </li>
      </ul>
    </template>
  </main>
</template>

<style scoped>
.groups-page {
  max-width: 720px;
}

.box {
  display: block;
  padding: 1rem;
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius-sm);
  background: var(--fp-surface);
}

.group-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 64px;
  color: var(--fp-ink);
  text-decoration: none;
}

.group-card:hover {
  border-color: var(--fp-primary);
}

.avatar-stack {
  display: flex;
  flex-shrink: 0;
}

.avatar-stack > * + * {
  margin-left: -8px;
}

.min-w-0 {
  min-width: 0; /* lets text-truncate work inside a flex row */
}

.tap {
  min-height: 44px; /* big enough to tap with a finger */
}
</style>
