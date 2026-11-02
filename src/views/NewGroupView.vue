<script setup>
// Owner: Eashvar. New group (/groups/new), from "New group" on My Chats.
// Name the group and tick the friends in it. You become its owner, and it opens on its own page.
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { createGroup, getAddablePeople, groupUserId } from '@/services/groups'
import PeoplePicker from '@/components/groups/PeoplePicker.vue'

const router = useRouter()
const auth = useAuthStore()
const myId = computed(() => groupUserId(auth.user))

const name = ref('')
const people = ref([])
const picked = ref([]) // user_ids of the ticked friends
const loading = ref(true)
const loadError = ref('')
const busy = ref(false)
const error = ref('')
const created = ref(null) // { group, notAdded } when someone couldn't be added

onMounted(async () => {
  try {
    people.value = await getAddablePeople(myId.value)
  } catch (err) {
    console.error(err)
    loadError.value = 'Couldn’t load your friends. You can make the group and add them later.'
  }
  loading.value = false
})

function togglePerson(userId) {
  if (picked.value.includes(userId)) {
    picked.value = picked.value.filter((id) => id !== userId)
  } else {
    picked.value.push(userId)
  }
}

const canCreate = computed(() => name.value.trim() !== '' && !busy.value)

async function create() {
  error.value = ''
  busy.value = true
  try {
    const chosen = people.value.filter((p) => picked.value.includes(p.user_id))
    const result = await createGroup(name.value, chosen, myId.value)
    if (result.notAdded.length > 0) {
      created.value = result // say who's missing before moving on
    } else {
      router.push({ name: 'group', params: { groupId: result.group.id } })
    }
  } catch (err) {
    console.error(err)
    error.value = err.message || 'Couldn’t make the group. Try again.'
  }
  busy.value = false
}
</script>

<template>
  <main class="container py-4 new-group">
    <RouterLink :to="{ name: 'chats' }" class="back">← My Chats</RouterLink>
    <h1 class="h3 mt-2 mb-1">New group</h1>
    <p class="text-muted mb-4">
      For the friends you meet up with often. Keep one chat going and plan each hangout with
      everyone already added.
    </p>

    <div v-if="created" class="box" role="alert">
      <p class="mb-3">
        Made “{{ created.group.name }}”, but couldn’t add {{ created.notAdded.join(', ') }}. Only
        your friends and people you’ve had a hangout with can be added.
      </p>
      <RouterLink
        class="btn btn-primary tap"
        :to="{ name: 'group', params: { groupId: created.group.id } }"
      >
        Open the group →
      </RouterLink>
    </div>

    <form v-else class="box" novalidate @submit.prevent="create">
      <div class="mb-4">
        <label for="group-name" class="form-label fw-semibold">Group name</label>
        <input
          id="group-name"
          v-model="name"
          class="form-control tap"
          type="text"
          maxlength="60"
          placeholder="e.g. Uni friends"
          autocomplete="off"
        />
      </div>

      <fieldset class="mb-4">
        <legend class="form-label fw-semibold mb-1">Who’s in it?</legend>
        <p class="small text-muted mb-2">
          Your friends and people you’ve had a hangout with. You can add more later.
        </p>
        <p v-if="loading" class="small text-muted mb-0">Loading your friends…</p>
        <p v-else-if="loadError" class="small text-danger mb-0">{{ loadError }}</p>
        <p v-else-if="people.length === 0" class="small text-muted mb-0">
          No friends yet. Add some on the Friends page, or make the group now and add them later.
        </p>
        <PeoplePicker
          v-else
          :people="people"
          :picked="picked"
          id-prefix="new-group"
          @toggle="togglePerson"
        />
      </fieldset>

      <p v-if="error" class="text-danger small" role="alert">{{ error }}</p>
      <div class="actions">
        <span class="small text-muted">
          {{ picked.length === 0 ? 'Just you so far' : `You and ${picked.length} more` }}
        </span>
        <button type="submit" class="btn btn-primary tap" :disabled="!canCreate">
          {{ busy ? 'Making the group…' : 'Create group' }}
        </button>
      </div>
    </form>
  </main>
</template>

<style scoped>
.new-group {
  max-width: 640px;
}

.back {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
}

.box {
  background: var(--fp-surface);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
  box-shadow: var(--fp-shadow);
  padding: 1.25rem 1.5rem;
}

.tap {
  min-height: 44px;
}

.btn.tap {
  display: inline-flex;
  align-items: center;
}

.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
}
</style>
