<script setup>
// 05 Create hangout & invite
// Owner: Matrix · Vet by: Hugo
// Figma frame "05". Left: hangout details (with quick date buttons and a name idea).
// Right: "Who's coming?" (tick friends to add them straight away) and a live summary.
// Anyone else can be invited with the Invite button in the step bar once the hangout exists.
// (Surya, improve/user-friendly-customised: friends list with search, quick dates, optional name
// with a suggestion, short "why" notes, a remembered switch, a summary, and a hint saying what's
// missing when Create is greyed out. "Voting closes" moved to 11 Vote, where the host starts it.)
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createHangout, getPastFriends, makeInviteCode } from '@/services/hangouts'
import {
  addFriendToHangout,
  getFriend,
  getFriendships,
  searchPeople,
  sendFriendRequest,
} from '@/services/friends'
import { useAuthStore } from '@/stores/auth'
import MemberAvatar from '@/components/voting/MemberAvatar.vue'
import WeekForecast from '@/components/weather/WeekForecast.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

// emoji + color give each vibe its own look when picked; nameWord is for the name idea
const vibes = [
  { value: 'chill', label: 'Chill', emoji: '☕', color: '#0e9384', nameWord: 'chill' },
  { value: 'food', label: 'Food', emoji: '🍜', color: '#e8772e', nameWord: 'makan' },
  { value: 'study', label: 'Study', emoji: '📚', color: '#4a7fe8', nameWord: 'study session' },
  {
    value: 'celebrate',
    label: 'Celebrate',
    emoji: '🎉',
    color: '#d6528f',
    nameWord: 'celebration',
  },
  { value: 'active', label: 'Active', emoji: '🏃', color: '#3a9d5d', nameWord: 'workout' },
  { value: 'shopping', label: 'Shopping', emoji: '🛍️', color: '#8b5cf6', nameWord: 'shopping' },
]

function toDateInput(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const today = toDateInput(new Date())

// Part (a) Quick date buttons: Tonight, Tomorrow, this Saturday and this Sunday
function addDays(date, days) {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

const now = new Date()
const quickDates = [
  { label: 'Tonight', value: toDateInput(now) },
  { label: 'Tomorrow', value: toDateInput(addDays(now, 1)) },
]
// getDay(): 0 = Sunday ... 6 = Saturday. % 7 keeps the number of days between 0 and 6.
const weekend = [
  { label: 'This Sat', days: (6 - now.getDay() + 7) % 7 },
  { label: 'This Sun', days: (7 - now.getDay()) % 7 },
]
for (const day of weekend) {
  const value = toDateInput(addDays(now, day.days))
  // skip it if it's the same day as Tonight or Tomorrow
  if (!quickDates.find((q) => q.value === value)) {
    quickDates.push({ label: day.label, value: value })
  }
}

// Remember the switch ("Let friends add where they're coming from") for next time, in this browser
const SWITCH_KEY = 'fairpoint-friends-add-start'

function loadFriendsAddStart() {
  try {
    if (localStorage.getItem(SWITCH_KEY) === 'false') {
      return false
    }
  } catch (error) {
    console.error(error) // e.g. private browsing blocks localStorage
  }
  return true
}

function saveFriendsAddStart() {
  try {
    localStorage.setItem(SWITCH_KEY, String(form.friendsAddStart))
  } catch (error) {
    console.error(error)
  }
}

// "Plan something" on the dashboard opens this page with ?date=2026-10-26
const queryDate = /^\d{4}-\d{2}-\d{2}$/.test(route.query.date ?? '') ? route.query.date : ''

const form = reactive({
  name: '',
  date: queryDate,
  time: '19:00',
  vibe: [],
  friendsAddStart: loadFriendsAddStart(),
})

// Part (b) Who's coming? Your friends (Friends page) and people from past hangouts, once each.
// The ticked ones are added as soon as the hangout is created.
const friends = ref([])
const selectedFriends = ref([]) // user_ids of the ticked friends
const friendsLoading = ref(true)
const friendsError = ref('')

async function loadFriends() {
  friendsLoading.value = true
  friendsError.value = ''
  try {
    let myId = null
    if (auth.user) {
      myId = auth.user.id
    }
    const lists = await getFriendships(myId)
    const past = await getPastFriends(myId)

    // together = how many hangouts you've had with them (0 for friends you haven't met up with yet)
    const all = []
    for (const f of lists.friends) {
      all.push({ ...f, together: 0 })
    }
    for (const person of past) {
      const existing = all.find((f) => f.user_id === person.user_id)
      if (existing) {
        existing.together = person.together
      } else {
        all.push(person)
      }
    }
    // The people you hang out with most come first (like "suggested" contacts)
    // A to Z by name, so you can find someone quickly (prof's feedback)
    all.sort((a, b) => a.display_name.localeCompare(b.display_name))

    // "Add to hangout" on the Friends page opens this page with ?with=<friend's id>: tick them.
    // The debrief's "Plan another with this group" passes several (?with=a&with=b).
    for (const withId of [].concat(route.query.with ?? [])) {
      if (!all.find((f) => f.user_id === withId)) {
        const picked = await getFriend(withId)
        if (picked) {
          all.unshift(picked)
        }
      }
      if (all.find((f) => f.user_id === withId) && !selectedFriends.value.includes(withId)) {
        selectedFriends.value.push(withId)
      }
    }
    friends.value = all
  } catch (error) {
    console.error(error)
    friendsError.value = "Couldn't load your friends. You can still add them on the next page."
  }
  friendsLoading.value = false
}

onMounted(loadFriends)

// The friend you came from on the Friends page or dashboard (?with=), or null (also when several
// people were passed: they're simply ticked in the list)
const withFriend = computed(() => {
  if (!route.query.with || Array.isArray(route.query.with)) {
    return null
  }
  const found = friends.value.find((f) => f.user_id === route.query.with)
  if (!found) {
    return null
  }
  return found
})

// Search: type a name to filter your friends
const friendSearch = ref('')

// With lots of friends, show the first 8 (A to Z), then "Show all". Searching shows every match.
const FIRST_FRIENDS = 8
const showAllFriends = ref(false)

const visibleFriends = computed(() => {
  if (showAllFriends.value || friendSearch.value.trim() !== '') {
    return shownFriends.value
  }
  return shownFriends.value.slice(0, FIRST_FRIENDS)
})

const hiddenCount = computed(() => shownFriends.value.length - visibleFriends.value.length)

const shownFriends = computed(() => {
  const text = friendSearch.value.trim().toLowerCase()
  if (text === '') {
    return friends.value
  }
  const result = []
  for (const f of friends.value) {
    if (f.display_name.toLowerCase().includes(text)) {
      result.push(f)
    }
  }
  return result
})

// Not one of your friends? Search everyone on Fairpoint. They can't be added straight away (the
// database only lets you add friends), so you send them a friend request instead.
const peopleResults = ref([])
const searchedText = ref('') // what the results are for, so old results hide when you type again
const searchingPeople = ref(false)
const peopleError = ref('')
const requestedIds = ref([]) // people you just sent a friend request to

async function searchEveryone() {
  const text = friendSearch.value.trim()
  peopleError.value = ''
  if (text.length < 2) {
    peopleError.value = 'Type at least 2 letters.'
    return
  }
  searchingPeople.value = true
  try {
    const found = await searchPeople(text)
    const result = []
    for (const person of found) {
      // skip yourself and people already in your list
      const isMe = auth.user && person.user_id === auth.user.id
      if (!isMe && !friends.value.find((f) => f.user_id === person.user_id)) {
        result.push(person)
      }
    }
    peopleResults.value = result
    searchedText.value = text
  } catch (error) {
    console.error(error)
    peopleError.value = 'Search isn’t working right now. Try again.'
  }
  searchingPeople.value = false
}

async function requestFriend(person) {
  peopleError.value = ''
  try {
    let myId = null
    if (auth.user) {
      myId = auth.user.id
    }
    await sendFriendRequest(myId, person.user_id)
    requestedIds.value.push(person.user_id)
  } catch (error) {
    console.error(error)
    peopleError.value = `Couldn’t send a friend request to ${person.display_name}.`
  }
}

// The ticked friends themselves, for the chips above the list
const selectedPeople = computed(() => {
  const result = []
  for (const f of friends.value) {
    if (selectedFriends.value.includes(f.user_id)) {
      result.push(f)
    }
  }
  return result
})

// Tap ✕ on a chip to untick that friend
function unselect(userId) {
  selectedFriends.value = selectedFriends.value.filter((id) => id !== userId)
}

// "Often with you" tag for people you've had 2 or more hangouts with
function isOften(friend) {
  return friend.together >= 2
}

// Names of the ticked friends, for the summary
const selectedNames = computed(() => {
  const names = []
  for (const f of friends.value) {
    if (selectedFriends.value.includes(f.user_id)) {
      names.push(f.display_name)
    }
  }
  return names
})

function toggleVibe(value) {
  const i = form.vibe.indexOf(value)
  if (i === -1) form.vibe.push(value)
  else form.vibe.splice(i, 1)
}

// The invite code is made here and saved with the hangout. Friends get the link on 06 Starting
// points once the hangout exists (showing it here, before saving, gave links that didn't work yet).
const inviteCode = makeInviteCode()

// Submit
const busy = ref(false)
const error = ref('')
const startsAt = computed(() =>
  form.date && form.time ? new Date(`${form.date}T${form.time}`) : null,
)
// The name is optional: if it's empty, the name idea is used
const canSubmit = computed(() => startsAt.value && !busy.value)

// Part (c) Say why Create is greyed out, e.g. "Add a date to continue."
const missingHint = computed(() => {
  const missing = []
  if (!form.date) {
    missing.push('a date')
  }
  if (!form.time) {
    missing.push('a time')
  }
  if (missing.length === 0) {
    return ''
  }
  if (missing.length === 1) {
    return `Add ${missing[0]} to continue.`
  }
  const last = missing[missing.length - 1]
  return `Add ${missing.slice(0, -1).join(', ')} and ${last} to continue.`
})

// Part (d) Name idea, e.g. "Saturday chill" (the day you picked + the first vibe)
const nameIdea = computed(() => {
  let day = new Date()
  if (form.date) {
    day = new Date(`${form.date}T12:00`)
  }
  const dayName = day.toLocaleDateString('en-SG', { weekday: 'long' })
  let word = 'hangout'
  if (form.vibe.length > 0) {
    const vibe = vibes.find((v) => v.value === form.vibe[0])
    word = vibe.nameWord
  }
  return `${dayName} ${word}`
})

// Part (e) Summary: "Sat 25 Oct · 7 PM"
function dateLabel(date) {
  const day = date
    .toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })
    .replace(',', '')
  let hour = date.getHours() % 12
  if (hour === 0) {
    hour = 12
  }
  let minutes = ''
  if (date.getMinutes() !== 0) {
    minutes = ':' + String(date.getMinutes()).padStart(2, '0')
  }
  let amPm = 'PM'
  if (date.getHours() < 12) {
    amPm = 'AM'
  }
  return `${day} · ${hour}${minutes} ${amPm}`
}

// "Chill, Food" or "Any vibe"
const vibeSummary = computed(() => {
  const labels = []
  for (const v of vibes) {
    if (form.vibe.includes(v.value)) {
      labels.push(`${v.emoji} ${v.label}`)
    }
  }
  if (labels.length === 0) {
    return 'Any vibe'
  }
  return labels.join(', ')
})

async function submit() {
  error.value = ''
  if (startsAt.value <= new Date()) {
    error.value = 'Pick a date and time in the future.'
    return
  }

  // No name typed? Use the suggestion, e.g. "Saturday chill"
  let name = form.name.trim()
  if (name === '') {
    name = nameIdea.value
  }

  busy.value = true
  try {
    // vote_deadline: null = the host sets when voting closes on 11 Vote, when they start the vote
    const hangout = await createHangout({
      name: name,
      starts_at: startsAt.value.toISOString(),
      vibe: form.vibe,
      vote_deadline: null,
      invite_code: inviteCode,
    })
    // Add the friends ticked in "Who's coming?", one by one. If one fails, the hangout still
    // exists and they can be added on 06 (Add friends).
    for (const userId of selectedFriends.value) {
      try {
        await addFriendToHangout(hangout.id, userId)
      } catch (e) {
        console.error(e)
      }
    }
    saveFriendsAddStart()
    router.push({
      name: 'starting-points',
      params: { id: hangout.id },
      // TODO(Matrix): save this on the hangout once the schema has a column for it
      query: form.friendsAddStart ? {} : { entry: 'host' },
    })
  } catch (e) {
    error.value = e.message || 'Could not create the hangout. Please try again.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="container create">
    <RouterLink class="back" :to="{ name: 'dashboard' }">&larr; My hangouts</RouterLink>

    <header class="create__header">
      <h1 class="create__title">New hangout</h1>
      <p class="create__sub">Pick a day and your friends. That’s it.</p>
    </header>

    <form id="create-hangout" class="create__grid" novalidate @submit.prevent="submit">
      <!-- Hangout details -->
      <section class="panel details">
        <h2 class="panel__title">Hangout details</h2>

        <div class="field">
          <label for="hangout-name" class="form-label">
            Hangout name <span class="optional">(optional)</span>
          </label>
          <input
            id="hangout-name"
            v-model="form.name"
            class="form-control"
            type="text"
            maxlength="80"
            :placeholder="nameIdea"
            aria-describedby="name-hint"
          />
          <p id="name-hint" class="field-hint mt-1 mb-0">Leave it blank to use this name.</p>
        </div>

        <!-- When: quick date buttons + date and time -->
        <p class="form-label mb-2">When</p>
        <div class="chips mb-3" role="group" aria-label="Pick a day">
          <button
            v-for="q in quickDates"
            :key="q.value"
            type="button"
            class="chip"
            :class="{ 'is-on': form.date === q.value }"
            :aria-pressed="form.date === q.value"
            @click="form.date = q.value"
          >
            {{ q.label }}
          </button>
        </div>

        <div class="row g-3 field">
          <div class="col-sm-6">
            <label for="hangout-date" class="form-label">Date</label>
            <input
              id="hangout-date"
              v-model="form.date"
              class="form-control"
              type="date"
              :min="today"
              required
            />
          </div>
          <div class="col-sm-6">
            <label for="hangout-time" class="form-label">Time</label>
            <input
              id="hangout-time"
              v-model="form.time"
              class="form-control"
              type="time"
              step="900"
              required
            />
          </div>
        </div>

        <!-- Weather this week, right under the dates: tap a day to pick it -->
        <WeekForecast
          class="field"
          pickable
          :selected-date="form.date"
          @pick="form.date = $event"
        />

        <!-- Shown (not folded away): it decides who adds the starting points -->
        <div class="switch-row field">
          <div>
            <label for="hangout-self-start" class="switch-row__label">
              Let friends add where they’re coming from
            </label>
            <p class="switch-row__hint">
              Turn this off to fill in everyone’s starting point yourself. We’ll remember your
              choice.
            </p>
          </div>
          <div class="form-check form-switch mb-0">
            <input
              id="hangout-self-start"
              v-model="form.friendsAddStart"
              class="form-check-input"
              type="checkbox"
              role="switch"
            />
          </div>
        </div>

        <fieldset class="field">
          <legend class="form-label">What’s the vibe?</legend>
          <p class="field-hint">We use this to suggest spots near your meeting point.</p>
          <div class="chips">
            <button
              v-for="v in vibes"
              :key="v.value"
              type="button"
              class="chip vibe-chip"
              :class="{ 'is-on': form.vibe.includes(v.value) }"
              :style="{ '--vibe': v.color }"
              :aria-pressed="form.vibe.includes(v.value)"
              @click="toggleVibe(v.value)"
            >
              <span aria-hidden="true">{{ v.emoji }}</span> {{ v.label }}
            </button>
          </div>
        </fieldset>
      </section>

      <div class="side">
        <!-- Who's coming? Ticked friends are added when the hangout is created -->
        <section class="panel">
          <div class="d-flex justify-content-between align-items-baseline gap-2">
            <h2 class="panel__title mb-1">Who’s coming?</h2>
            <span v-if="selectedPeople.length > 0" class="small text-secondary"
              >{{ selectedPeople.length }} picked</span
            >
          </div>

          <!-- Picked friends first, as chips (✕ to remove), then the list to pick from -->
          <ul v-if="selectedPeople.length > 0" class="picked" aria-label="Picked friends">
            <li v-for="p in selectedPeople" :key="p.user_id" class="picked__chip">
              <MemberAvatar :name="p.display_name" :color="p.avatar_color" :size="24" />
              <span class="picked__name">{{ p.display_name }}</span>
              <button
                type="button"
                class="picked__remove"
                :aria-label="`Remove ${p.display_name}`"
                @click="unselect(p.user_id)"
              >
                ✕
              </button>
            </li>
          </ul>

          <p class="panel__sub">
            Tick your friends and they’re added straight away. Anyone else can join with the Invite
            link on the next page.
          </p>

          <p v-if="withFriend" class="with-friend mb-2">
            Hanging out with <strong>{{ withFriend.display_name }}</strong> (ticked below)
          </p>

          <label for="friend-search" class="visually-hidden">Search by name</label>
          <input
            id="friend-search"
            v-model="friendSearch"
            type="search"
            class="form-control mb-2"
            placeholder="Search by name"
            autocomplete="off"
            @keydown.enter.prevent="searchEveryone"
          />

          <p v-if="friendsLoading" class="panel__sub mb-0">Loading your friends…</p>
          <p v-else-if="friendsError" class="panel__sub mb-0">{{ friendsError }}</p>
          <p v-else-if="friends.length === 0 && friendSearch.trim() === ''" class="panel__sub mb-0">
            No friends yet. Search for people above, or invite them with the link on the next page.
          </p>
          <p v-else-if="shownFriends.length === 0" class="panel__sub mb-0">
            No friends called “{{ friendSearch.trim() }}”.
          </p>
          <ul v-else class="people">
            <li v-for="f in visibleFriends" :key="f.user_id">
              <label class="person">
                <input
                  v-model="selectedFriends"
                  type="checkbox"
                  class="form-check-input"
                  :value="f.user_id"
                />
                <MemberAvatar :name="f.display_name" :color="f.avatar_color" :size="32" />
                <span class="person__name">{{ f.display_name }}</span>
                <span v-if="isOften(f)" class="often">Often with you</span>
              </label>
            </li>
          </ul>
          <!-- More than 8 friends: the rest are one tap away -->
          <button
            v-if="hiddenCount > 0 || (showAllFriends && shownFriends.length > FIRST_FRIENDS)"
            type="button"
            class="btn btn-link show-all"
            @click="showAllFriends = !showAllFriends"
          >
            {{ showAllFriends ? 'Show fewer ▴' : `Show all (${hiddenCount} more) ▾` }}
          </button>

          <!-- Search everyone on Fairpoint (shown while you're searching) -->
          <button
            v-if="friendSearch.trim().length >= 2"
            type="button"
            class="btn btn-link btn-sm search-all"
            :disabled="searchingPeople"
            @click="searchEveryone"
          >
            {{ searchingPeople ? 'Searching…' : `Search everyone for “${friendSearch.trim()}”` }}
          </button>
          <p v-if="peopleError" class="small text-danger mb-0" role="alert">{{ peopleError }}</p>

          <template v-if="searchedText !== '' && searchedText === friendSearch.trim()">
            <p v-if="peopleResults.length === 0" class="panel__sub mb-0">
              Nobody else on Fairpoint matches “{{ searchedText }}”.
            </p>
            <template v-else>
              <p class="panel__sub mb-1">
                Not your friends yet. Send a request, and once they accept you can add them to
                hangouts. Or share the Invite link on the next page.
              </p>
              <ul class="people">
                <li v-for="p in peopleResults" :key="p.user_id" class="person">
                  <MemberAvatar :name="p.display_name" :color="p.avatar_color" :size="32" />
                  <span class="person__name">{{ p.display_name }}</span>
                  <span v-if="requestedIds.includes(p.user_id)" class="requested">Requested</span>
                  <button
                    v-else
                    type="button"
                    class="btn btn-outline-primary btn-sm request-btn"
                    :aria-label="`Send ${p.display_name} a friend request`"
                    @click="requestFriend(p)"
                  >
                    Add friend
                  </button>
                </li>
              </ul>
            </template>
          </template>
        </section>

        <!-- Summary: fills in as you type -->
        <section class="panel summary" aria-live="polite">
          <h2 class="panel__title mb-2">Summary</h2>
          <dl class="summary__list">
            <dt>Name</dt>
            <dd>{{ form.name.trim() || `${nameIdea} (suggested)` }}</dd>
            <dt>When</dt>
            <dd>{{ startsAt ? dateLabel(startsAt) : 'Pick a date' }}</dd>
            <dt>Vibe</dt>
            <dd>{{ vibeSummary }}</dd>
            <dt>Who</dt>
            <dd>
              You<template v-if="selectedNames.length > 0"
                >, {{ selectedNames.join(', ') }}</template
              >
            </dd>
          </dl>

          <!-- Create sits with the summary, like a checkout -->
          <button
            type="submit"
            class="btn btn-primary btn-create w-100"
            :disabled="!canSubmit"
            aria-describedby="create-hint"
          >
            <span
              v-if="busy"
              class="spinner-border spinner-border-sm me-2"
              aria-hidden="true"
            ></span>
            Create &amp; add starting points &rarr;
          </button>
          <!-- Why the Create button is greyed out -->
          <p v-if="missingHint && !busy" id="create-hint" class="missing-hint">{{ missingHint }}</p>
          <p v-if="error" class="alert alert-danger py-2 small mt-3 mb-0" role="alert">
            {{ error }}
          </p>
          <RouterLink class="btn btn-link btn-cancel w-100" :to="{ name: 'dashboard' }">
            Cancel
          </RouterLink>
        </section>
      </div>
    </form>
  </main>
</template>

<style scoped>
.create {
  max-width: 1060px;
  padding-block: 2rem 4rem;
}

.back {
  display: inline-flex;
  align-items: center;
  min-height: 44px; /* big enough to tap with a finger */
  color: var(--fp-primary);
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
}

.back:hover {
  text-decoration: underline;
}

.create__header {
  margin-block: 1.25rem 1.5rem;
}

.create__title {
  margin-bottom: 0.4rem;
  font-size: 1.85rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.create__sub {
  margin: 0;
  color: var(--fp-muted);
}

.create__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
  gap: 1.25rem;
  align-items: stretch; /* both columns end at the same height */
}

.panel {
  padding: 1.75rem 1.5rem;
  background: var(--fp-surface);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
}

.panel__title {
  margin-bottom: 1.25rem;
  font-size: 1.1rem;
  font-weight: 700;
}

.panel__sub {
  margin-bottom: 1rem;
  color: var(--fp-muted);
  font-size: 0.85rem;
}

.field {
  margin-bottom: 1.25rem;
}

fieldset.field {
  padding: 0;
  border: 0;
}

.form-label {
  margin-bottom: 0.45rem;
  font-size: 0.9rem;
  font-weight: 600;
}

legend.form-label {
  float: none;
  width: auto;
}

.form-control,
.form-select {
  padding-block: 0.7rem;
  background-color: var(--fp-surface);
  font-size: 0.9rem;
}

.form-control:focus,
.form-select:focus {
  border-color: var(--fp-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--fp-primary) 15%, transparent);
}

/* Vibe chips */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.chip {
  min-height: 44px;
  padding: 0.5rem 1.1rem;
  border: 1px solid var(--fp-border);
  border-radius: 999px;
  background: var(--fp-surface);
  color: var(--fp-ink);
  font-size: 0.9rem;
}

.chip:hover {
  border-color: var(--fp-primary);
}

.chip.is-on {
  border-color: var(--fp-primary);
  background: var(--fp-primary);
  color: var(--fp-surface);
}

/* Toggle row */
.switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--fp-border);
}

.switch-row__label {
  font-size: 0.9rem;
  font-weight: 600;
}

.switch-row__hint {
  margin: 0;
  color: var(--fp-muted);
  font-size: 0.8rem;
}

.form-switch .form-check-input {
  width: 2.6em;
  height: 1.4em;
  cursor: pointer;
}

.form-check-input:checked {
  background-color: var(--fp-primary);
  border-color: var(--fp-primary);
}

.form-check-input:focus {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--fp-primary) 15%, transparent);
}

/* "Hanging out with Ryan" */
.with-friend {
  color: var(--fp-primary);
}

/* Small grey helper text */
.optional,
.field-hint {
  color: var(--fp-muted);
  font-size: 0.8rem;
  font-weight: 400;
}

.field-hint {
  margin: -0.2rem 0 0.6rem;
}

/* Search everyone */
.search-all {
  min-height: 44px;
  padding: 0;
  font-weight: 600;
  text-decoration: none;
  text-align: left;
  overflow-wrap: anywhere;
}

.request-btn {
  flex-shrink: 0;
  min-height: 44px;
  margin-left: auto;
}

.requested {
  flex-shrink: 0;
  margin-left: auto;
  color: var(--fp-muted);
  font-size: 0.85rem;
  font-weight: 600;
}

/* Hangout details: a column, so the weather card can sit at the bottom */
.details {
  display: flex;
  flex-direction: column;
}

.details .switch-row {
  margin-bottom: 1.25rem;
}

/* Vibe chips: each vibe has its own colour (--vibe, set on the button) when picked */
.vibe-chip:hover {
  border-color: var(--vibe);
}

.vibe-chip.is-on {
  border-color: var(--vibe);
  background: color-mix(in srgb, var(--vibe) 16%, var(--fp-surface));
  color: var(--fp-ink);
  font-weight: 600;
}

/* Picked friends chips */
.picked {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 0;
  margin: 0 0 0.75rem;
  list-style: none;
}

.picked__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  max-width: 100%;
  padding: 0.15rem 0.15rem 0.15rem 0.3rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--fp-primary) 12%, var(--fp-surface));
}

.picked__name {
  min-width: 0;
  overflow: hidden;
  font-size: 0.85rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picked__remove {
  display: inline-grid;
  flex-shrink: 0;
  place-items: center;
  width: 44px;
  height: 44px;
  margin: -0.4rem 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--fp-muted);
  font-size: 0.8rem;
}

.picked__remove:hover {
  color: var(--fp-ink);
}

/* "Often with you" tag */
.often {
  flex-shrink: 0;
  margin-left: auto;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--fp-accent) 14%, var(--fp-surface));
  color: var(--fp-ink);
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

/* Right column: Who's coming? + Summary */
.side {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-width: 0;
}

/* "Who's coming?" grows to fill the column, so both columns always end level */
.side > .panel:first-child {
  flex-grow: 1;
}

/* On big screens the summary (with the Create button) stays in view while you scroll */
@media (min-width: 768px) {
  .summary {
    position: sticky;
    top: 1rem;
  }
}

.show-all {
  min-height: 44px;
  padding: 0;
  font-weight: 600;
  text-decoration: none;
}

.people {
  max-height: 420px;
  padding: 0;
  margin: 0.5rem 0 0;
  overflow-y: auto;
  list-style: none;
}

.person {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 48px; /* big enough to tap with a finger */
  cursor: pointer;
}

.person .form-check-input {
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
  margin: 0;
}

.person__name {
  min-width: 0;
  overflow: hidden;
  font-size: 0.9rem;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Summary */
.summary__list {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.5rem 1rem;
  margin: 0 0 1.25rem;
  font-size: 0.9rem;
}

.summary__list dt {
  color: var(--fp-muted);
  font-weight: 500;
}

.summary__list dd {
  margin: 0;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.missing-hint {
  margin: 0.5rem 0 0;
  color: var(--fp-muted);
  font-size: 0.85rem;
  text-align: center;
}

/* Create + Cancel inside the summary card */
.btn-create {
  min-height: 48px;
  padding: 0.7rem 1.25rem;
  font-weight: 600;
}

.btn-cancel {
  min-height: 44px;
  margin-top: 0.25rem;
  color: var(--fp-muted);
  font-weight: 600;
  text-decoration: none;
}

@media (max-width: 767.98px) {
  .create__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
