<script setup>
// Owner: Surya. "Add friends" on 06 Starting points (host only): your friends (accepted on the
// Friends page) and everyone you've been in a hangout with, once each. Tick as many as you like
// and add them all at once, so you don't have to send the invite link.
// Usage: <PastFriends :hangout="store.hangout" :my-id="myId" @added="reloadHangout" />
//   added → people were added (the page reloads the hangout so they appear in Your group)
import { computed, onMounted, ref } from 'vue'
import { addMember, getPastFriends } from '@/services/hangouts'
import { getFriendships } from '@/services/friends'
import MemberAvatar from '@/components/voting/MemberAvatar.vue'

const props = defineProps({
  hangout: { type: Object, required: true }, // needs id, members
  myId: { type: String, required: true },
})

const emit = defineEmits(['added'])

const friends = ref([])
const selected = ref([]) // user_ids of the ticked friends
const loading = ref(true)
const adding = ref(false)
const error = ref('')
const message = ref('')

// Part (a) Load your friends: accepted friends + people from past hangouts, once each
async function loadFriends() {
  loading.value = true
  error.value = ''
  try {
    const past = await getPastFriends(props.myId)
    const lists = await getFriendships(props.myId)

    const all = []
    for (const friend of lists.friends) {
      all.push({ ...friend, together: 0, isFriend: true })
    }
    for (const person of past) {
      const existing = all.find((f) => f.user_id === person.user_id)
      if (existing) {
        existing.together = person.together
      } else {
        all.push({ ...person, isFriend: false })
      }
    }
    friends.value = all
  } catch (err) {
    console.error(err)
    error.value = "Couldn't load your friends."
  }
  loading.value = false
}

onMounted(loadFriends)

// Part (b) Only show people who aren't in this hangout yet
const notYetIn = computed(() => {
  const result = []
  for (const friend of friends.value) {
    const alreadyIn = props.hangout.members.find((m) => m.user_id === friend.user_id)
    if (!alreadyIn) {
      result.push(friend)
    }
  }
  return result
})

// "Friend · 2 hangouts together"
function detail(friend) {
  const parts = []
  if (friend.isFriend) {
    parts.push('Friend')
  }
  if (friend.together === 1) {
    parts.push('1 hangout together')
  } else if (friend.together > 1) {
    parts.push(`${friend.together} hangouts together`)
  }
  return parts.join(' · ')
}

// Part (c) Add everyone ticked, one after the other
async function addSelected() {
  error.value = ''
  message.value = ''
  if (selected.value.length === 0) {
    return
  }
  adding.value = true

  const failed = []
  let added = 0
  for (const userId of selected.value) {
    const friend = friends.value.find((f) => f.user_id === userId)
    try {
      await addMember(props.hangout.id, userId)
      added++
    } catch (err) {
      console.error(err)
      failed.push(friend ? friend.display_name : 'someone')
    }
  }

  selected.value = []
  adding.value = false
  if (added > 0) {
    message.value = added === 1 ? 'Added 1 friend.' : `Added ${added} friends.`
    emit('added')
  }
  if (failed.length > 0) {
    error.value = `Couldn't add ${failed.join(', ')}. Only the host can add people.`
  }
}
</script>

<template>
  <div class="past-friends">
    <div class="d-flex justify-content-between align-items-baseline">
      <div class="fw-semibold">Add friends</div>
      <span v-if="selected.length > 0" class="small text-secondary">
        {{ selected.length }} selected
      </span>
    </div>

    <p v-if="loading" class="small text-secondary mb-0">Loading…</p>
    <p v-else-if="friends.length === 0" class="small text-secondary mb-0">
      Your friends (from the Friends page or past hangouts) will show up here.
    </p>
    <p v-else-if="notYetIn.length === 0" class="small text-secondary mb-0">
      All your friends are already in this hangout.
    </p>

    <template v-else>
      <ul class="list-unstyled mb-0 mt-2">
        <li v-for="friend in notYetIn" :key="friend.user_id">
          <label class="friend">
            <input
              v-model="selected"
              type="checkbox"
              class="form-check-input"
              :value="friend.user_id"
              :disabled="adding"
            />
            <MemberAvatar :name="friend.display_name" :color="friend.avatar_color" :size="32" />
            <span class="min-w-0 flex-grow-1">
              <span class="d-block fw-semibold text-truncate">{{ friend.display_name }}</span>
              <span class="d-block small text-secondary">{{ detail(friend) }}</span>
            </span>
          </label>
        </li>
      </ul>
      <button
        type="button"
        class="btn btn-primary w-100 mt-2 add-btn"
        :disabled="adding || selected.length === 0"
        @click="addSelected"
      >
        <span v-if="adding">Adding…</span>
        <span v-else-if="selected.length > 1">Add {{ selected.length }} friends</span>
        <span v-else>Add selected</span>
      </button>
    </template>

    <p v-if="message" class="small save-ok mt-2 mb-0">
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke="currentColor"
          stroke-width="2.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      {{ message }}
    </p>
    <p v-if="error" class="small text-danger mt-2 mb-0" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.past-friends {
  padding: 1rem;
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius-sm);
  background: var(--fp-bg);
}

.friend {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 44px; /* big enough to tap with a finger */
  padding: 0.25rem 0;
  cursor: pointer;
}

.friend .form-check-input {
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
  margin: 0;
}

.min-w-0 {
  min-width: 0; /* lets text-truncate work inside a flex row */
}

.add-btn {
  min-height: 44px;
}

.save-ok {
  color: var(--fp-primary);
  font-weight: 600;
}
</style>
