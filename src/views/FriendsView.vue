<script setup>
// Friends
// Owner: Ryan
// friends: search, send and accept requests, see pending and my friends (data: services/friends.js)
import { ref, computed, onMounted, watch } from 'vue'
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
import PaginationNav from '@/components/shared/PaginationNav.vue'
import { usePagination } from '@/composables/usePagination'
import { sortPeople } from '@/utils/peopleSearch'

const auth = useAuthStore()
const alerts = useAlertsStore()
const router = useRouter()
const myId = computed(() => (auth.user ? auth.user.id : null))

// each is [{ user_id, display_name, avatar_color }]
const friends = ref([]) // my friends
const pending = ref([]) // you asked them
const requests = ref([]) // they asked you
const loading = ref(false)
const error = ref('')
const actionError = ref('')
const actionDone = ref('') // "Friend request sent to Mei." after something worked

// one call fills all three lists, and it runs again after every change so the page always matches the database
async function loadFriendships() {
  try {
    const lists = await getFriendships(myId.value) // { friends, pending, requests }
    friends.value = lists.friends
    pending.value = lists.pending
    requests.value = lists.requests
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
const searchedText = ref('') // (Surya) what the results are for
const searching = ref(false)
const searchError = ref('')

// (Surya) pressing Search (or Enter) says when the text is too short; typing just waits quietly
async function search(sayIfTooShort = true) {
  const text = query.value.trim() // trim() drops spaces at either end
  searchError.value = ''
  // 1 letter would match almost everyone, so ask for at least 2
  if (text.length < 2) {
    if (sayIfTooShort) {
      searchError.value = 'Type at least 2 letters of a name, or a full email.'
    } else {
      results.value = []
      searched.value = false
    }
    return
  }
  searching.value = true // also disables the search button
  try {
    const found = await searchPeople(text)
    // (Surya) you kept typing while this search ran: a newer search will show its own results
    if (text !== query.value.trim()) {
      return
    }
    results.value = found
    searchedText.value = text
    resultsPaging.page.value = 1
    searched.value = true
  } catch (err) {
    console.error(err)
    searchError.value = 'Could not search right now. Try again in a moment.'
  } finally {
    searching.value = false // also runs after the early return above
  }
}

// empty the search box and hide the results, after adding or accepting someone from them
function clearSearch() {
  query.value = ''
  results.value = []
  searched.value = false
}

// where a search result stands with you: 'friend', 'pending', 'request' or 'none'
// find() gives back the person or undefined, and undefined counts as false in an if
function statusOf(userId) {
  if (friends.value.find((f) => f.user_id === userId)) return 'friend' // already friends
  if (pending.value.find((f) => f.user_id === userId)) return 'pending' // i asked them
  if (requests.value.find((f) => f.user_id === userId)) return 'request' // they asked me
  return 'none' // a stranger
}

// (Surya) Search as you type: it waits until you stop typing for a moment, so it doesn't search
// after every letter. Search and Enter still work too.
let searchTimer = null
watch(query, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => search(false), 400)
})

// (Surya) One list, closest people first (like Instagram, the same rules as "Who's coming?" on
// New hangout): friends, then people who asked you, people you asked, then everyone else; inside
// each, names that start with what you typed first, then A to Z (utils/peopleSearch.js).
// Friends and requests come from this page's own lists, so every match shows, not just the ones
// in the database's 10 results.
const SEARCH_ORDER = { friend: 0, request: 1, pending: 2, none: 3 }

const sortedResults = computed(() => {
  const text = searchedText.value.toLowerCase()
  const rows = []
  const seen = [] // each person once
  for (const p of [...friends.value, ...requests.value, ...pending.value, ...results.value]) {
    if (seen.includes(p.user_id)) {
      continue
    }
    // my own lists are filtered here; the database's results already match (by name or email)
    const fromDatabase = results.value.includes(p)
    if (!fromDatabase && !p.display_name.toLowerCase().includes(text)) {
      continue
    }
    seen.push(p.user_id)
    rows.push({ ...p, status: statusOf(p.user_id) })
  }
  return sortPeople(rows, text, SEARCH_ORDER)
})

// 6 people per page in each list
const resultsPaging = usePagination(sortedResults)
const pendingPaging = usePagination(pending)
const friendsPaging = usePagination(friends)

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
    <RouterLink :to="{ name: 'dashboard' }" class="small">← My hangouts</RouterLink>
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
      <p v-if="sortedResults.length === 0" class="text-muted small mb-0">No one found.</p>
      <div v-for="p in resultsPaging.pageItems.value" :key="p.user_id" class="person">
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
      <p v-if="sortedResults.length > 0" class="text-muted small text-center mt-2 mb-0">
        {{ resultsPaging.rangeText.value }}
      </p>
      <PaginationNav v-model="resultsPaging.page.value" :page-count="resultsPaging.pageCount.value" label="search results" />
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
        <div v-for="p in pendingPaging.pageItems.value" :key="p.user_id" class="person">
          <span class="name">{{ p.display_name }}</span>
        </div>
        <p v-if="pending.length > 0" class="text-muted small text-center mt-2 mb-0">
          {{ pendingPaging.rangeText.value }}
        </p>
        <PaginationNav v-model="pendingPaging.page.value" :page-count="pendingPaging.pageCount.value" label="pending" />
      </section>

      <section id="my-friends" class="box">
        <h2 class="h6 fw-bold mb-2">My Friends</h2>
        <p v-if="friends.length === 0" class="text-muted small mb-0">
          No friends yet. Search above to add some.
        </p>
        <div v-for="f in friendsPaging.pageItems.value" :key="f.user_id" class="person">
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
        <p v-if="friends.length > 0" class="text-muted small text-center mt-2 mb-0">
          {{ friendsPaging.rangeText.value }}
        </p>
        <PaginationNav v-model="friendsPaging.page.value" :page-count="friendsPaging.pageCount.value" label="friends" />
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
