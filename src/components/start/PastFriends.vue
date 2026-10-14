<script setup>
// Owner: Surya. "Friends from past hangouts" on 06 Starting points (host only): everyone you've
// been in a hangout with, each with an Add button, so you don't have to send the invite link again.
// Usage: <PastFriends :hangout="store.hangout" :my-id="myId" @added="reloadHangout" />
//   added → someone was added (the page reloads the hangout so they appear in Your group)
import { computed, onMounted, ref } from 'vue'
import { addMember, getPastFriends } from '@/services/hangouts'
import MemberAvatar from '@/components/voting/MemberAvatar.vue'

const props = defineProps({
  hangout: { type: Object, required: true }, // needs id, members
  myId: { type: String, required: true },
})

const emit = defineEmits(['added'])

const friends = ref([])
const loading = ref(true)
const error = ref('')
const addingId = ref(null) // the friend being added right now (to disable their button)

// Part (a) Load everyone you've had a hangout with
async function loadFriends() {
  loading.value = true
  error.value = ''
  try {
    friends.value = await getPastFriends(props.myId)
  } catch (err) {
    console.error(err)
    error.value = "Couldn't load your friends from past hangouts."
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

// Part (c) Add a friend to this hangout
async function add(friend) {
  error.value = ''
  addingId.value = friend.user_id
  try {
    await addMember(props.hangout.id, friend.user_id)
    emit('added', friend)
  } catch (err) {
    console.error(err)
    error.value = `Couldn't add ${friend.display_name}: ${err.message}`
  }
  addingId.value = null
}
</script>

<template>
  <div class="past-friends">
    <div class="fw-semibold">Friends from past hangouts</div>

    <p v-if="loading" class="small text-secondary mb-0">Loading…</p>
    <p v-else-if="friends.length === 0" class="small text-secondary mb-0">
      People you've had a hangout with will show up here, so you can add them in one tap next time.
    </p>
    <p v-else-if="notYetIn.length === 0" class="small text-secondary mb-0">
      All your friends from past hangouts are already in this one.
    </p>

    <ul v-else class="list-unstyled mb-0 mt-2">
      <li v-for="friend in notYetIn" :key="friend.user_id" class="friend">
        <MemberAvatar :name="friend.display_name" :color="friend.avatar_color" :size="32" />
        <div class="min-w-0 flex-grow-1">
          <div class="fw-semibold text-truncate">{{ friend.display_name }}</div>
          <div class="small text-secondary">
            {{ friend.together }} {{ friend.together === 1 ? 'hangout' : 'hangouts' }} together
          </div>
        </div>
        <button
          type="button"
          class="btn btn-outline-primary btn-sm add-btn"
          :disabled="addingId === friend.user_id"
          :aria-label="`Add ${friend.display_name} to this hangout`"
          @click="add(friend)"
        >
          <span v-if="addingId === friend.user_id">Adding…</span>
          <span v-else>Add</span>
        </button>
      </li>
    </ul>

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
  padding: 0.4rem 0;
}

.min-w-0 {
  min-width: 0; /* lets text-truncate work inside a flex row */
}

.add-btn {
  flex-shrink: 0;
  min-height: 44px; /* big enough to tap with a finger */
}
</style>
