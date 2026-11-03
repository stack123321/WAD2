<script setup>
// Friends
// Owner: Ryan
// friends: search, send and accept requests, see pending and my friends (data: services/friends.js)
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAlertsStore } from '@/stores/alerts'
import { getMyHangouts, addMember } from '@/services/hangouts'
import {
  searchPeople,
  getFriendships,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
} from '@/services/friends'
import { getOrCreateDirectChat } from '@/services/directChats'
import AddToHangout from '@/components/friends/AddToHangout.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'

const auth = useAuthStore()
const alerts = useAlertsStore()
const router = useRouter()
const myId = computed(() => (auth.user ? auth.user.id : null))

// each is [{ user_id, display_name, avatar_color }]
const friends = ref([]) // my friends
const pending = ref([]) // you asked them
const requests = ref([]) // they asked you
const pageSize = 6
const pendingCurrentPage = ref(1)
const friendsCurrentPage = ref(1)
const loading = ref(false)
const error = ref('')
const actionError = ref('')
const actionDone = ref('') // "Friend request sent to Mei." after something worked

function clampPage(page, total) {
  return Math.min(page, Math.max(1, Math.ceil(total / pageSize)))
}

// one call fills all three lists, and it runs again after every change so the page always matches the database
async function loadFriendships() {
  try {
    const lists = await getFriendships(myId.value) // { friends, pending, requests }
    friends.value = lists.friends
    pending.value = lists.pending
    requests.value = lists.requests
    friendsCurrentPage.value = clampPage(friendsCurrentPage.value, friends.value.length)
    pendingCurrentPage.value = clampPage(pendingCurrentPage.value, pending.value.length)
  } catch (err) {
    console.error(err)
    error.value = 'Could not load your friends.'
  }
}

// upcoming hangouts I host that are still collecting starting points: the ones I can add friends to
const openHangouts = ref([])

async function loadOpenHangouts() {
  try {
    const hangouts = await getMyHangouts()
    const now = new Date()
    // i host it, people are still adding starting points, and it hasn't started
    openHangouts.value = hangouts.filter(
      (h) => h.host_id === myId.value && h.status === 'collecting' && new Date(h.starts_at) > now,
    )
  } catch (err) {
    // only the shortcut is lost: "Add to hangout" still starts a new hangout with them
    console.error(err)
  }
}

onMounted(async () => {
  // not awaited: the friend list shows straight away, the hangout menu fills in when ready
  loadOpenHangouts()
  loading.value = true // shows "Loading your friends…"
  await loadFriendships()
  loading.value = false
})

// search
const query = ref('') // what's typed in the search box
const results = ref([]) // people found, [{ user_id, display_name, avatar_color }]
const searched = ref(false) // true after the first search, so "no one found" only shows then
const searching = ref(false)
const searchError = ref('')
const currentPage = ref(1)

async function search() {
  if (searching.value) return // already searching, so ignore a second press
  searchError.value = ''
  // 1 letter would match almost everyone, so ask for at least 2. 0 letters will remove the list altogether.
  if (query.value.trim().length === 0) {
    searching.value = false
    searched.value = false
    results.value = []
    return
  } else if (query.value.trim().length < 2) {
    searchError.value = 'Type at least 2 letters of a name, or a full email.'
    return
  }
  searching.value = true // also disables the search button
  try {
    results.value = await searchPeople(query.value.trim()) // trim() drops spaces at either end
    currentPage.value = 1
    searched.value = true
  } catch (err) {
    console.error(err)
    searchError.value = 'Could not search right now. Try again in a moment.'
  }
  searching.value = false
}

// empty the search box and hide the results, after adding or accepting someone from them
function clearSearch() {
  query.value = ''
  results.value = []
  searched.value = false
  currentPage.value = 1
}

// where a search result stands with you: 'friend', 'pending', 'request' or 'none'
// find() gives back the person or undefined, and undefined counts as false in an if
function statusOf(userId) {
  if (friends.value.find((f) => f.user_id === userId)) return 'friend' // already friends
  if (pending.value.find((f) => f.user_id === userId)) return 'pending' // i asked them
  if (requests.value.find((f) => f.user_id === userId)) return 'request' // they asked me
  return 'none' // a stranger
}

// friends first, since with a long list most searches are to find a friend to invite
const sortedResults = computed(() => {
  const mine = results.value.filter((p) => statusOf(p.user_id) === 'friend')
  const others = results.value.filter((p) => statusOf(p.user_id) !== 'friend')
  return mine.concat(others) // friends, then everyone else
})
const pageCount = computed(() => Math.ceil(sortedResults.value.length / pageSize))
const pageResults = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return sortedResults.value.slice(start, start + pageSize)
})
const firstVisibleResult = computed(() => (currentPage.value - 1) * pageSize + 1)
const lastVisibleResult = computed(() =>
  Math.min(currentPage.value * pageSize, sortedResults.value.length),
)
const pendingPageCount = computed(() => Math.ceil(pending.value.length / pageSize))
const pendingPageItems = computed(() => {
  const start = (pendingCurrentPage.value - 1) * pageSize
  return pending.value.slice(start, start + pageSize)
})
const pendingFirstVisible = computed(() => (pendingCurrentPage.value - 1) * pageSize + 1)
const pendingLastVisible = computed(() =>
  Math.min(pendingCurrentPage.value * pageSize, pending.value.length),
)
const friendsPageCount = computed(() => Math.ceil(friends.value.length / pageSize))
const friendsPageItems = computed(() => {
  const start = (friendsCurrentPage.value - 1) * pageSize
  return friends.value.slice(start, start + pageSize)
})
const friendsFirstVisible = computed(() => (friendsCurrentPage.value - 1) * pageSize + 1)
const friendsLastVisible = computed(() =>
  Math.min(friendsCurrentPage.value * pageSize, friends.value.length),
)

// each action below clears the old messages, saves the change, reloads the lists, then says what happened.
async function addFriend(person) {
  actionError.value = ''
  actionDone.value = ''
  try {
    await sendFriendRequest(myId.value, person.user_id)
    await loadFriendships() // they now show under pending
    clearSearch()
    actionDone.value = `Friend request sent to ${person.display_name}.`
  } catch (err) {
    console.error(err)
    actionError.value = `Couldn't send a friend request to ${person.display_name}.`
  }
}

async function accept(person) {
  actionError.value = ''
  actionDone.value = ''
  try {
    await acceptFriendRequest(myId.value, person.user_id)
    await loadFriendships()
    alerts.refresh(myId.value) // one request fewer, so update the badge on friends
    // accepted from the search results: clear them, like after adding
    if (results.value.some((r) => r.user_id === person.user_id)) clearSearch()
    actionDone.value = `You and ${person.display_name} are now friends.`
  } catch (err) {
    console.error(err)
    actionError.value = `Couldn't accept ${person.display_name}'s request.`
  }
}

async function decline(person) {
  actionError.value = ''
  actionDone.value = ''
  try {
    await declineFriendRequest(myId.value, person.user_id) // deletes their request
    await loadFriendships()
    alerts.refresh(myId.value) // update the badge here too
  } catch (err) {
    console.error(err)
    actionError.value = `Couldn't decline ${person.display_name}'s request.`
  }
}

// opens my one to one chat with a friend, made the first time
async function openChat(person) {
  actionError.value = ''
  try {
    const chat = await getOrCreateDirectChat(person) // the existing chat, or a new one the first time
    router.push({ name: 'direct-chat', params: { chatId: chat.id } }) // go to it
  } catch (err) {
    console.error(err)
    actionError.value = `Couldn't open a chat with ${person.display_name}.`
  }
}

// adds a friend to one of my hangouts from the "Add to hangout" menu
async function addToHangout(person, hangout) {
  actionError.value = ''
  actionDone.value = ''
  try {
    await addMember(hangout.id, person.user_id)
    // so the menu stops offering this hangout for them
    hangout.members.push({ user_id: person.user_id })
    actionDone.value = `Added ${person.display_name} to ${hangout.name}.`
  } catch (err) {
    console.error(err)
    actionError.value = `Couldn't add ${person.display_name} to ${hangout.name}.`
  }
}

const confirming = ref(null) // the friend the pop-up is asking about

async function remove() {
  const person = confirming.value
  confirming.value = null // close the pop-up first, so a double click can't run it twice
  actionError.value = ''
  try {
    await removeFriend(myId.value, person.user_id)
    await loadFriendships() // they disappear from my friends
  } catch (err) {
    console.error(err)
    actionError.value = `Couldn't remove ${person.display_name}.`
  }
}
</script>

<template>
  <main class="container py-4 friends-page">
    <router-link :to="{ name: 'dashboard' }" class="small">← My hangouts</router-link>
    <h1 class="page-title mt-2 mb-3">Friends</h1>

    <!-- search -->
    <form class="mb-3" role="search" @submit.prevent="search">
      <label for="friend-search" class="visually-hidden">Search by name or email</label>
      <div class="input-group search-box">
        <input
          id="friend-search"
          v-model="query"
          type="search"
          class="form-control"
          placeholder="Search by name or email"
        />
        <button type="submit" class="btn btn-primary" :disabled="searching">Search</button>
      </div>
    </form>
    <p v-if="searchError" class="text-danger small mb-2">{{ searchError }}</p>

    <!-- search results, only after a search: each row shows what i can do with that person -->
    <section v-if="searched" id="search-results" class="box mb-4">
      <p v-if="results.length === 0" class="text-muted small mb-0">No one found.</p>
      <p v-else-if="pageCount > 1" class="text-muted small mb-2" aria-live="polite">
        Showing {{ firstVisibleResult }}–{{ lastVisibleResult }} of
        {{ sortedResults.length }} people
      </p>
      <div v-for="p in pageResults" :key="p.user_id" class="person">
        <span class="name">{{ p.display_name }}</span>
        <!-- one of four: friend (add to hangout, chat), requested, accept their request, or add friend -->
        <template v-if="statusOf(p.user_id) === 'friend'">
          <span class="tag">Friends ✓</span>
          <AddToHangout :friend="p" :hangouts="openHangouts" @add="addToHangout" />
          <button
            type="button"
            class="btn btn-outline-primary btn-sm"
            :aria-label="`Chat with ${p.display_name}`"
            @click="openChat(p)"
          >
            Chat
          </button>
        </template>
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
          class="btn btn-outline-primary btn-sm ms-auto"
          :aria-label="`Add ${p.display_name} as a friend`"
          @click="addFriend(p)"
        >
          Add Friend
        </button>
      </div>
      <nav v-if="pageCount > 1" aria-label="Friend search result pages" class="mt-3">
        <ul class="pagination pagination-sm justify-content-center mb-0">
          <li class="page-item" :class="{ disabled: currentPage === 1 }">
            <button
              type="button"
              class="page-link"
              aria-label="Previous page"
              :disabled="currentPage === 1"
              @click="currentPage -= 1"
            >
              Previous
            </button>
          </li>
          <li
            v-for="page in pageCount"
            :key="page"
            class="page-item"
            :class="{ active: currentPage === page }"
          >
            <button
              type="button"
              class="page-link"
              :aria-label="`Page ${page}`"
              :aria-current="currentPage === page ? 'page' : undefined"
              @click="currentPage = page"
            >
              {{ page }}
            </button>
          </li>
          <li class="page-item" :class="{ disabled: currentPage === pageCount }">
            <button
              type="button"
              class="page-link"
              aria-label="Next page"
              :disabled="currentPage === pageCount"
              @click="currentPage += 1"
            >
              Next
            </button>
          </li>
        </ul>
      </nav>
    </section>

    <!-- what the last action did: red if it failed, green tick if it worked -->
    <p v-if="actionError" class="text-danger small" role="alert">{{ actionError }}</p>
    <p v-if="actionDone" class="done small" role="status">✓ {{ actionDone }}</p>

    <p v-if="loading" class="text-muted">Loading your friends…</p>
    <p v-else-if="error" class="text-danger">{{ error }}</p>

    <template v-else>
      <!-- requests sent to you: only shows when there are some -->
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
        <p v-else-if="pendingPageCount > 1" class="text-muted small mb-2" aria-live="polite">
          Showing {{ pendingFirstVisible }}–{{ pendingLastVisible }} of {{ pending.length }} people
        </p>
        <div v-for="p in pendingPageItems" :key="p.user_id" class="person">
          <span class="name">{{ p.display_name }}</span>
        </div>
        <nav v-if="pendingPageCount > 1" aria-label="Pending list pages" class="mt-3">
          <ul class="pagination pagination-sm justify-content-center mb-0">
            <li class="page-item" :class="{ disabled: pendingCurrentPage === 1 }">
              <button
                type="button"
                class="page-link"
                aria-label="Previous pending page"
                :disabled="pendingCurrentPage === 1"
                @click="pendingCurrentPage -= 1"
              >
                Previous
              </button>
            </li>
            <li
              v-for="page in pendingPageCount"
              :key="page"
              class="page-item"
              :class="{ active: pendingCurrentPage === page }"
            >
              <button
                type="button"
                class="page-link"
                :aria-label="`Pending page ${page}`"
                :aria-current="pendingCurrentPage === page ? 'page' : undefined"
                @click="pendingCurrentPage = page"
              >
                {{ page }}
              </button>
            </li>
            <li class="page-item" :class="{ disabled: pendingCurrentPage === pendingPageCount }">
              <button
                type="button"
                class="page-link"
                aria-label="Next pending page"
                :disabled="pendingCurrentPage === pendingPageCount"
                @click="pendingCurrentPage += 1"
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      </section>

      <section id="my-friends" class="box">
        <h2 class="h6 fw-bold mb-2">My Friends</h2>
        <p v-if="friends.length === 0" class="text-muted small mb-0">
          No friends yet. Search above to add some.
        </p>
        <p v-else-if="friendsPageCount > 1" class="text-muted small mb-2" aria-live="polite">
          Showing {{ friendsFirstVisible }}–{{ friendsLastVisible }} of {{ friends.length }} friends
        </p>
        <div v-for="f in friendsPageItems" :key="f.user_id" class="person">
          <span class="name">{{ f.display_name }}</span>
          <AddToHangout class="ms-auto" :friend="f" :hangouts="openHangouts" @add="addToHangout" />
          <button
            type="button"
            class="btn btn-outline-primary btn-sm"
            :aria-label="`Chat with ${f.display_name}`"
            @click="openChat(f)"
          >
            Chat
          </button>
          <!-- removing is rare and can't be undone, so it sits in the ⋯ menu like on the dashboard cards -->
          <div class="dropdown">
            <button
              type="button"
              class="btn btn-link text-muted menu-btn"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              :aria-label="`More options for ${f.display_name}`"
            >
              ···
            </button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li>
                <button
                  type="button"
                  class="dropdown-item text-danger"
                  :aria-label="`Remove ${f.display_name} as a friend`"
                  @click="confirming = f"
                >
                  Remove friend
                </button>
              </li>
            </ul>
          </div>
        </div>
        <nav v-if="friendsPageCount > 1" aria-label="Friends list pages" class="mt-3">
          <ul class="pagination pagination-sm justify-content-center mb-0">
            <li class="page-item" :class="{ disabled: friendsCurrentPage === 1 }">
              <button
                type="button"
                class="page-link"
                aria-label="Previous friends page"
                :disabled="friendsCurrentPage === 1"
                @click="friendsCurrentPage -= 1"
              >
                Previous
              </button>
            </li>
            <li
              v-for="page in friendsPageCount"
              :key="page"
              class="page-item"
              :class="{ active: friendsCurrentPage === page }"
            >
              <button
                type="button"
                class="page-link"
                :aria-label="`Friends page ${page}`"
                :aria-current="friendsCurrentPage === page ? 'page' : undefined"
                @click="friendsCurrentPage = page"
              >
                {{ page }}
              </button>
            </li>
            <li class="page-item" :class="{ disabled: friendsCurrentPage === friendsPageCount }">
              <button
                type="button"
                class="page-link"
                aria-label="Next friends page"
                :disabled="friendsCurrentPage === friendsPageCount"
                @click="friendsCurrentPage += 1"
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      </section>
    </template>

    <ConfirmDialog
      :open="confirming !== null"
      :title="confirming ? `Remove ${confirming.display_name}?` : ''"
      text="They'll be taken off your friends list. You can add them again later."
      button="Remove friend"
      danger
      @confirm="remove"
      @cancel="confirming = null"
    />
  </main>
</template>

<style scoped>
.friends-page {
  max-width: 720px;
}

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
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.6rem 0;
}

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

/* white with a darker edge, so the search box stands out from the page */
.search-box .form-control {
  background: var(--fp-surface);
  border-color: var(--fp-muted);
}

/* every button is at least 44px tall so it's easy to tap on a phone */
.person .btn,
.search-box .btn {
  min-height: 44px;
  display: inline-flex; /* so the label stays in the middle of the taller button */
  align-items: center;
  justify-content: center;
}

.search-box .form-control {
  min-height: 44px; /* as tall as the Search button beside it */
}

/* the ⋯ button: a 44px square, easy to tap */
.menu-btn {
  width: 44px;
  height: 44px;
  padding: 0;
  font-weight: 700;
  text-decoration: none;
}

/* teal, not Bootstrap's green, which is too light on the page background */
.done {
  color: var(--fp-primary);
}

.tag {
  margin-left: auto;
  color: var(--fp-muted);
  font-size: 0.85rem;
}
</style>
