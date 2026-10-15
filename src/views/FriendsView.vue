<script setup>
// Friends: search for people, send friend requests, accept requests sent to you, and see who
// you've asked (Pending) and your friends (My Friends). Opened from "Hangout with" on 04 Dashboard.
// Owner: Ryan. Data: services/friends.js → the friendships table (supabase/schema.sql).
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import {
  searchPeople,
  getFriendships,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
} from '@/services/friends'

const auth = useAuthStore()
const myId = computed(() => (auth.user ? auth.user.id : null))

// Each is [{ user_id, display_name, avatar_color }]
const friends = ref([]) // My Friends
const pending = ref([]) // you asked them
const requests = ref([]) // they asked you
const loading = ref(false)
const error = ref('')
const actionError = ref('')

async function loadFriendships() {
  try {
    const lists = await getFriendships(myId.value)
    friends.value = lists.friends
    pending.value = lists.pending
    requests.value = lists.requests
  } catch (err) {
    console.log(err)
    error.value = 'Could not load your friends.'
  }
}

onMounted(async () => {
  loading.value = true
  await loadFriendships()
  loading.value = false
})

// Search
const query = ref('')
const results = ref([])
const searched = ref(false) // true after the first search, so "No one found" only shows then
const searching = ref(false)
const searchError = ref('')

async function search() {
  searchError.value = ''
  if (query.value.trim().length < 2) {
    searchError.value = 'Type at least 2 letters of a name, or a full email.'
    return
  }
  searching.value = true
  try {
    results.value = await searchPeople(query.value.trim())
    searched.value = true
  } catch (err) {
    console.log(err)
    searchError.value = 'Could not search right now. Try again in a moment.'
  }
  searching.value = false
}

// Where a search result stands with you: 'friend', 'pending', 'request' or 'none'
function statusOf(userId) {
  if (friends.value.find((f) => f.user_id === userId)) return 'friend'
  if (pending.value.find((f) => f.user_id === userId)) return 'pending'
  if (requests.value.find((f) => f.user_id === userId)) return 'request'
  return 'none'
}

async function addFriend(person) {
  actionError.value = ''
  try {
    await sendFriendRequest(myId.value, person.user_id)
    await loadFriendships()
  } catch (err) {
    console.log(err)
    actionError.value = `Couldn't send a friend request to ${person.display_name}.`
  }
}

async function accept(person) {
  actionError.value = ''
  try {
    await acceptFriendRequest(myId.value, person.user_id)
    await loadFriendships()
  } catch (err) {
    console.log(err)
    actionError.value = `Couldn't accept ${person.display_name}'s request.`
  }
}

async function decline(person) {
  actionError.value = ''
  try {
    await declineFriendRequest(myId.value, person.user_id)
    await loadFriendships()
  } catch (err) {
    console.log(err)
    actionError.value = `Couldn't decline ${person.display_name}'s request.`
  }
}
</script>

<template>
  <main class="container py-4 friends-page">
    <router-link :to="{ name: 'dashboard' }" class="small">← My hangouts</router-link>
    <h1 class="h3 mt-2 mb-3">Friends</h1>

    <!-- Search -->
    <form class="d-flex gap-2 mb-2" role="search" @submit.prevent="search">
      <label for="friend-search" class="visually-hidden">Search by name or email</label>
      <input
        id="friend-search"
        v-model="query"
        type="search"
        class="form-control"
        placeholder="Search by name or email"
      />
      <button type="submit" class="btn btn-primary" :disabled="searching">Search</button>
    </form>
    <p v-if="searchError" class="text-danger small mb-2">{{ searchError }}</p>

    <section v-if="searched" id="search-results" class="box mb-4">
      <p v-if="results.length === 0" class="text-muted small mb-0">No one found.</p>
      <div v-for="p in results" :key="p.user_id" class="person">
        <span class="name">{{ p.display_name }}</span>
        <span v-if="statusOf(p.user_id) === 'friend'" class="tag">Friends</span>
        <span v-else-if="statusOf(p.user_id) === 'pending'" class="tag">Requested</span>
        <button
          v-else-if="statusOf(p.user_id) === 'request'"
          type="button"
          class="btn btn-primary btn-sm ms-auto"
          @click="accept(p)"
        >
          Accept
        </button>
        <button
          v-else
          type="button"
          class="btn btn-primary btn-sm ms-auto"
          :aria-label="`Add ${p.display_name} as a friend`"
          @click="addFriend(p)"
        >
          Add Friend
        </button>
      </div>
    </section>

    <p v-if="actionError" class="text-danger small" role="alert">{{ actionError }}</p>

    <p v-if="loading" class="text-muted">Loading your friends…</p>
    <p v-else-if="error" class="text-danger">{{ error }}</p>

    <template v-else>
      <!-- Requests sent to you: only shows when there are some -->
      <section v-if="requests.length > 0" id="friend-requests" class="box mb-4">
        <h2 class="h6 fw-bold mb-2">Friend requests</h2>
        <div v-for="p in requests" :key="p.user_id" class="person">
          <span class="name">{{ p.display_name }}</span>
          <button type="button" class="btn btn-primary btn-sm ms-auto" @click="accept(p)">
            Accept
          </button>
          <button type="button" class="btn btn-outline-secondary btn-sm" @click="decline(p)">
            Decline
          </button>
        </div>
      </section>

      <section id="pending" class="box mb-4">
        <h2 class="h6 fw-bold mb-2">Pending</h2>
        <p v-if="pending.length === 0" class="text-muted small mb-0">No requests waiting.</p>
        <div v-for="p in pending" :key="p.user_id" class="person">
          <span class="name">{{ p.display_name }}</span>
        </div>
      </section>

      <section id="my-friends" class="box">
        <h2 class="h6 fw-bold mb-2">My Friends</h2>
        <p v-if="friends.length === 0" class="text-muted small mb-0">
          No friends yet. Search above to add some.
        </p>
        <div v-for="f in friends" :key="f.user_id" class="person">
          <span class="name">{{ f.display_name }}</span>
          <router-link
            :to="{ name: 'create-hangout', query: { with: f.user_id } }"
            class="btn btn-primary btn-sm ms-auto text-nowrap"
            :aria-label="`Add ${f.display_name} to hangout`"
          >
            Add to hangout
          </router-link>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.friends-page {
  max-width: 720px;
}

/* White cards, the same as on the dashboard */
.box {
  background: var(--fp-surface);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
  box-shadow: var(--fp-shadow);
  padding: 1.25rem 1.5rem;
}

.person {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0;
}

/* A line between rows, but not above the first one */
.person + .person {
  border-top: 1px solid var(--fp-border);
}

.name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.tag {
  margin-left: auto;
  color: var(--fp-muted);
  font-size: 0.85rem;
}
</style>
