<script setup>
// 05 Create hangout & invite
// Owner: Matrix
// Figma frame "05". Left: hangout details (with quick date buttons and a name idea).
// Right: "Who's coming?" (tick friends to add them straight away) and a live summary.
// Anyone else can be invited with the Invite button in the step bar once the hangout exists.
// (Surya, improve/user-friendly-customised: friends list with search, quick dates, optional name
// with a suggestion, short "why" notes, a remembered switch, a summary, and a hint saying what's
// missing when Create is greyed out. "Voting closes" moved to 11 Vote, where the host starts it.)
// (Surya) Also opens in edit mode at /hangouts/:id/edit ("Details" in the step bar): the host
// changes the name, date, time or vibe after the hangout is made. People are managed on 06.
// (Eashvar) "Plan a hangout with this group" on a friend group opens this page with ?group=<id>:
// everyone in the group is ticked (untick anyone who can't make it), the hangout is tagged with
// the group, and everyone's usual starting point and transport are filled in on 06.
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  createHangout,
  getHangout,
  getPastFriends,
  makeInviteCode,
  removeMember,
  updateHangoutDetails,
} from '@/services/hangouts'
import { useHangoutStore } from '@/stores/hangout'
import { finalSpot, repeatHangout } from '@/services/goAgain'
import {
  fillUsualStarts,
  getGroup,
  getGroupHangouts,
  groupUserId,
  usualTrips,
} from '@/services/groups'
import { isMockHangout } from '@/services/votes'
import {
  acceptFriendRequest,
  addFriendToHangout,
  getFriend,
  getFriendships,
  searchPeople,
  sendFriendRequest,
} from '@/services/friends'
import { useAuthStore } from '@/stores/auth'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import MemberAvatar from '@/components/shared/MemberAvatar.vue'
import WeekForecast from '@/components/weather/WeekForecast.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

// emoji + color give each vibe its own look when picked; nameWord is for the name idea
const vibes = [
  { value: 'chill', label: 'Chill', emoji: '☕', color: 'var(--fp-vibe-chill)', nameWord: 'chill' },
  { value: 'food', label: 'Food', emoji: '🍜', color: 'var(--fp-vibe-food)', nameWord: 'makan' },
  { value: 'study', label: 'Study', emoji: '📚', color: 'var(--fp-blue)', nameWord: 'study session' },
  {
    value: 'celebrate',
    label: 'Celebrate',
    emoji: '🎉',
    color: 'var(--fp-pink)',
    nameWord: 'celebration',
  },
  { value: 'active', label: 'Active', emoji: '🏃', color: 'var(--fp-vibe-active)', nameWord: 'workout' },
  { value: 'shopping', label: 'Shopping', emoji: '🛍️', color: 'var(--fp-vibe-shopping)', nameWord: 'shopping' },
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

// (Surya) edit mode loads them too: the host can add more friends on step 0 Details
async function loadFriends() {
  friendsLoading.value = true
  friendsError.value = ''
  try {
    let myId = null
    if (auth.user) {
      myId = auth.user.id
    }
    const lists = await getFriendships(myId)
    // (Surya) requests from before this visit: ones you sent show "Requested", ones sent to you "Accept"
    requestedIds.value = lists.pending.map((p) => p.user_id)
    askedYouIds.value = lists.requests.map((p) => p.user_id)
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
    // (Eashvar) Planning with a friend group: everyone in it is in the list, and ticked
    if (planGroup.value) {
      for (const m of planGroup.value.members) {
        if (m.user_id === groupUserId(auth.user)) {
          continue
        }
        if (!all.find((f) => f.user_id === m.user_id)) {
          all.push({
            user_id: m.user_id,
            display_name: m.display_name,
            avatar_color: m.avatar_color,
            together: 0,
          })
        }
        if (!selectedFriends.value.includes(m.user_id)) {
          selectedFriends.value.push(m.user_id)
        }
      }
    }

    // (Surya) People you often hang out with (2 or more hangouts) come first, then everyone else.
    // Each part is A to Z by name, so you can still find someone quickly (prof's feedback)
    all.sort((a, b) => {
      if (isOften(a) !== isOften(b)) {
        return isOften(a) ? -1 : 1
      }
      return a.display_name.localeCompare(b.display_name)
    })

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

// (Eashvar) the friend group this hangout is planned with (?group=), loaded before the friends
// list so its people can be ticked. groupTrips = everyone's usual starting point.
const groupId = typeof route.query.group === 'string' ? route.query.group : ''
const planGroup = ref(null)
const groupTrips = ref({})

async function loadGroupThenFriends() {
  if (groupId !== '' && !isEdit) {
    try {
      planGroup.value = await getGroup(groupId)
      if (planGroup.value) {
        const past = await getGroupHangouts(groupId)
        groupTrips.value = usualTrips(planGroup.value, past)
      }
    } catch (err) {
      console.error(err) // the page still works as a normal new hangout
    }
  }
  await loadFriends()
}

onMounted(loadGroupThenFriends)

// (Eashvar) how many of the ticked people have a usual starting point to fill in
const groupStartsCount = computed(() => {
  if (!planGroup.value) {
    return 0
  }
  const coming = [groupUserId(auth.user), ...selectedFriends.value]
  return coming.filter((id) => groupTrips.value[id]).length
})

// (Surya) Edit mode: "Details" in the step bar opens /hangouts/:id/edit, filled in with the
// hangout's name, date, time and vibe. Only the host can save (the database checks it too).
const isEdit = route.name === 'edit-hangout'
const editId = isEdit ? route.params.id : ''
const store = useHangoutStore()
const editLoaded = ref(false)

const canEdit = computed(() => {
  if (!store.hangout) {
    return false
  }
  if (isMockHangout(editId)) {
    return true // the demo: anyone can try it (nothing is saved)
  }
  return Boolean(auth.user) && store.hangout.host_id === auth.user.id
})

// Where Back, Cancel and Save go: the step you came from (?from=), or 06 Starting points
const STEP_PAGES = ['starting-points', 'transport', 'midpoint', 'explore', 'vote', 'final-plan']
const backTo = computed(() => {
  let page = 'starting-points'
  if (STEP_PAGES.includes(route.query.from)) {
    page = route.query.from
  }
  return { name: page, params: { id: editId } }
})

// "2026-10-16T11:00:00Z" → "2026-10-16" and "19:00", in Singapore time
function sgParts(iso) {
  const date = new Date(iso)
  const day = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' }) // YYYY-MM-DD
  const time = date.toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Singapore',
    hour: '2-digit',
    minute: '2-digit',
  })
  return { day: day, time: time }
}

async function loadEdit() {
  if (!isEdit) {
    return
  }
  await store.load(editId)
  if (store.hangout) {
    form.name = store.hangout.name
    form.vibe = [...(store.hangout.vibe ?? [])]
    if (store.hangout.starts_at) {
      const parts = sgParts(store.hangout.starts_at)
      form.date = parts.day
      form.time = parts.time
    }
  }
  editLoaded.value = true
}

onMounted(loadEdit)

// Everyone in the hangout, for the summary in edit mode
const memberNames = computed(() => {
  if (!isEdit || !store.hangout) {
    return []
  }
  const names = []
  for (const m of store.members) {
    names.push(m.display_name)
  }
  return names
})

// (Surya) Everyone already in the hangout (edit mode), shown as chips and left out of the list
const members = computed(() => {
  if (!isEdit || !store.hangout) {
    return []
  }
  return store.members
})

const memberIds = computed(() => {
  const ids = []
  for (const m of members.value) {
    ids.push(m.user_id)
  }
  return ids
})

// (Surya) The host taps ✕ on someone's chip, confirms, and they're removed straight away
// (with their starting point, transport and vote). Not the host themselves.
const removing = ref(null) // the member the "Remove …?" pop-up is asking about
const removeError = ref('')

function isHostChip(m) {
  return store.hangout && m.user_id === store.hangout.host_id
}

async function confirmRemove() {
  const person = removing.value
  removing.value = null
  removeError.value = ''
  try {
    await removeMember(editId, person.user_id)
    if (isMockHangout(editId)) {
      // the sample hangout has no database: just take them off the list
      store.members.splice(store.members.indexOf(person), 1)
    } else {
      await store.load(editId) // the step bar and Starting points update too
    }
  } catch (e) {
    console.error(e)
    removeError.value = `Couldn’t remove ${person.display_name}. Try again.`
  }
}

async function saveEdit(name) {
  busy.value = true
  try {
    const fields = { name: name, starts_at: startsAt.value.toISOString(), vibe: [...form.vibe] }
    await updateHangoutDetails(editId, fields)
    // the step bar shows the new name and date straight away
    store.hangout.name = fields.name
    store.hangout.starts_at = fields.starts_at
    store.hangout.vibe = fields.vibe
    // (Surya) add the friends ticked in "Who's coming?", one by one, like New hangout does.
    // If one fails, the rest are still added (and they can join with the Invite link).
    if (selectedFriends.value.length > 0) {
      for (const userId of selectedFriends.value) {
        try {
          await addFriendToHangout(editId, userId)
        } catch (e) {
          console.error(e)
        }
      }
      await store.load(editId) // the step bar and Starting points show them straight away
    }
    router.push(backTo.value)
  } catch (e) {
    error.value = e.message || 'Couldn’t save the changes. Please try again.'
  }
  busy.value = false
}

// (Surya) "Go again" on a past hangout opens this page with ?again=<its id> (and ?with= for the
// group): same group, same place and starting points, so you only pick a new date and go
// straight to the final plan
const againId = typeof route.query.again === 'string' ? route.query.again : ''
const againHangout = ref(null)
const againLoaded = ref(false)
const againNotAdded = ref([]) // names Go again couldn't add, shown after creating
const againDone = ref(null) // the new hangout's id, once created with someone missing

const againSpot = computed(() => finalSpot(againHangout.value))

async function loadAgain() {
  if (againId === '') {
    return
  }
  try {
    againHangout.value = await getHangout(againId)
    if (againSpot.value) {
      form.name = `${againHangout.value.name} (again)`
      form.vibe = [...(againHangout.value.vibe ?? [])]
    }
  } catch (err) {
    console.error(err) // the page still works as a normal new hangout
  }
  againLoaded.value = true
}

onMounted(loadAgain)

// "Ryan, Nicole and Hugo" for the banner
const againNames = computed(() => {
  if (!againHangout.value) {
    return ''
  }
  const names = []
  for (const m of againHangout.value.members) {
    if (!auth.user || m.user_id !== auth.user.id) {
      names.push(m.display_name)
    }
  }
  if (names.length <= 1) {
    return names.join('')
  }
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
})

// The friend you came from on the Friends page or dashboard (?with=), or null (also when several
// people were passed: they're simply ticked in the list)
const withFriend = computed(() => {
  if (!route.query.with || Array.isArray(route.query.with)) {
    return null
  }
  return friends.value.find((f) => f.user_id === route.query.with) ?? null
})

// Search: type a name to filter your friends
const friendSearch = ref('')

// (Surya) Only the first 5 friends show (the ones you hang out with most). Searching shows every
// friend who matches, plus anyone else on Fairpoint (below).
const FIRST_FRIENDS = 5
const searching = computed(() => friendSearch.value.trim() !== '')

const visibleFriends = computed(() => {
  if (searching.value) {
    return shownFriends.value
  }
  return shownFriends.value.slice(0, FIRST_FRIENDS)
})

const shownFriends = computed(() => {
  const text = friendSearch.value.trim().toLowerCase()
  const result = []
  for (const f of friends.value) {
    // (Surya) edit mode: people already in the hangout show as chips above, not in the list
    if (memberIds.value.includes(f.user_id)) {
      continue
    }
    if (text === '' || f.display_name.toLowerCase().includes(text)) {
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
const requestedIds = ref([]) // people you sent a friend request to (still waiting on them)
const askedYouIds = ref([]) // people who sent you a friend request

async function searchEveryone() {
  const text = friendSearch.value.trim()
  peopleError.value = ''
  if (text.length < 2) {
    peopleResults.value = []
    searchedText.value = ''
    searchingPeople.value = false
    return
  }
  searchingPeople.value = true
  try {
    const found = await searchPeople(text)
    // (Surya) you kept typing while this search ran: a newer search will show its own results
    if (text !== friendSearch.value.trim()) {
      return
    }
    const result = []
    for (const person of found) {
      // skip yourself and your friends (they come from your own list). People already in the
      // hangout stay: the search list marks them "In hangout".
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

// (Surya) Searching shows ONE list of everyone who matches, closest people first, like Instagram:
// 1. friends (you can tick them), then people who asked you (Accept), people you asked
//    (Requested), everyone else (Add friend), and last people already in the hangout
// 2. inside each group: names that start with what you typed ("ry" → Ryan) before names that
//    only contain it (Henry)
// 3. then the most hangouts together, then A to Z
const ORDER = { friend: 0, request: 1, pending: 2, none: 3, member: 4 }

function statusOf(userId) {
  if (memberIds.value.includes(userId)) return 'member'
  if (friends.value.find((f) => f.user_id === userId)) return 'friend'
  if (askedYouIds.value.includes(userId)) return 'request'
  if (requestedIds.value.includes(userId)) return 'pending'
  return 'none'
}

// 0 if the name, or a word in it, starts with what you typed, else 1
function matchRank(name, text) {
  for (const word of name.toLowerCase().split(' ')) {
    if (word.startsWith(text)) {
      return 0
    }
  }
  return 1
}

const searchRows = computed(() => {
  const text = friendSearch.value.trim().toLowerCase()
  let myId = null
  if (auth.user) {
    myId = auth.user.id
  }
  const rows = []
  const seen = [] // each person once
  for (const p of [...shownFriends.value, ...members.value, ...peopleResults.value]) {
    if (seen.includes(p.user_id) || p.user_id === myId) {
      continue
    }
    if (!p.display_name.toLowerCase().includes(text)) {
      continue
    }
    seen.push(p.user_id)
    rows.push({ ...p, status: statusOf(p.user_id), rank: matchRank(p.display_name, text) })
  }
  rows.sort((a, b) => {
    if (ORDER[a.status] !== ORDER[b.status]) {
      return ORDER[a.status] - ORDER[b.status]
    }
    if (a.rank !== b.rank) {
      return a.rank - b.rank
    }
    const together = (b.together ?? 0) - (a.together ?? 0)
    if (together !== 0) {
      return together
    }
    return a.display_name.localeCompare(b.display_name)
  })
  return rows
})

// (Surya) Search everyone on Fairpoint as you type (no extra button to press). It waits until
// you stop typing for a moment, so it doesn't search after every letter.
let searchTimer = null
watch(friendSearch, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(searchEveryone, 400)
})

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
    // (Surya) 23505 = the database already has a request between you two (one per pair)
    if (error.code === '23505') {
      peopleError.value = 'Friend request already sent.'
      requestedIds.value.push(person.user_id)
      return
    }
    peopleError.value = `Couldn’t send a friend request to ${person.display_name}.`
  }
}

// (Surya) They already sent you a request: accept it here, and they move up to "Your friends"
// (the search still matches them) so you can tick them straight away
async function acceptRequest(person) {
  peopleError.value = ''
  try {
    let myId = null
    if (auth.user) {
      myId = auth.user.id
    }
    await acceptFriendRequest(myId, person.user_id)
    friends.value.push({ ...person, together: 0 })
    askedYouIds.value = askedYouIds.value.filter((id) => id !== person.user_id)
    peopleResults.value = peopleResults.value.filter((p) => p.user_id !== person.user_id)
  } catch (error) {
    console.error(error)
    peopleError.value = `Couldn’t accept ${person.display_name}’s request. Try again.`
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

// People you've had 2 or more hangouts with, who go to the top of the list
function isOften(friend) {
  return friend.together >= 2
}

// Names of the ticked friends, for the summary
const selectedNames = computed(() => selectedPeople.value.map((f) => f.display_name))

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

  // (Surya) edit mode: save the changes instead of making a new hangout
  if (isEdit) {
    await saveEdit(name)
    return
  }

  busy.value = true

  // (Surya) Go again: copy the group, place and trips, then open the final plan.
  // The sample hangouts (and no keys) have no database, so just show the sample plan
  if (againSpot.value && isMockHangout(againId)) {
    busy.value = false
    router.push({ name: 'final-plan', params: { id: againId } })
    return
  }
  if (againSpot.value) {
    try {
      const result = await repeatHangout(againHangout.value, {
        name: name,
        startsAt: startsAt.value,
        inviteCode: inviteCode,
        myId: auth.user ? auth.user.id : null,
        friendIds: selectedFriends.value,
      })
      if (!result.complete) {
        // the hangout exists, but something wasn't copied: finish it the normal way
        router.push({ name: 'starting-points', params: { id: result.id } })
      } else if (result.notAdded.length > 0) {
        againNotAdded.value = result.notAdded // say who's missing before moving on
        againDone.value = result.id
      } else {
        router.push({ name: 'final-plan', params: { id: result.id } })
      }
    } catch (e) {
      error.value = e.message || 'Could not create the hangout. Please try again.'
    }
    busy.value = false
    return
  }

  try {
    // vote_deadline: null = the host sets when voting closes on 11 Vote, when they start the vote
    const input = {
      name: name,
      starts_at: startsAt.value.toISOString(),
      vibe: form.vibe,
      vote_deadline: null,
      invite_code: inviteCode,
      friends_add_start: form.friendsAddStart,
    }
    // (Eashvar) tagged with the friend group, so it shows on the group's page
    if (planGroup.value) {
      input.group_id = planGroup.value.id
    }
    const hangout = await createHangout(input)
    // Add the friends ticked in "Who's coming?", one by one. If one fails, the hangout still
    // exists and they can be added on 06 (Add friends).
    for (const userId of selectedFriends.value) {
      try {
        await addFriendToHangout(hangout.id, userId)
      } catch (e) {
        console.error(e)
      }
    }
    // (Eashvar) fill in everyone's usual starting point and transport from the group
    if (planGroup.value) {
      const coming = [groupUserId(auth.user), ...selectedFriends.value]
      await fillUsualStarts(hangout.id, groupTrips.value, coming)
    }
    saveFriendsAddStart()
    router.push({
      name: 'starting-points',
      params: { id: hangout.id },
      // the choice is saved on the hangout (friends_add_start) and remembered in this browser for next time
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
    <RouterLink v-if="isEdit" class="back" :to="backTo">&larr; Back</RouterLink>
    <RouterLink v-else class="back" :to="{ name: 'dashboard' }">&larr; My hangouts</RouterLink>

    <header class="create__header">
      <h1 class="create__title page-title">{{ isEdit ? 'Hangout details' : 'New hangout' }}</h1>
      <p v-if="isEdit" class="create__sub">
        Change the name, date or vibe. Everyone in the hangout sees the change.
      </p>
      <p v-else class="create__sub">Pick a day and your friends. That’s it.</p>
    </header>

    <!-- (Surya) Go again: what's copied from last time, so you only need a date -->
    <div v-if="againSpot && !againDone" class="again-box" role="status">
      <strong>↻ Going again to {{ againSpot.name }}</strong
      ><template v-if="againNames"> with {{ againNames }}</template
      >. Pick a date, then Create. Everyone's starting point and transport are copied from last
      time, so you go straight to the plan.
    </div>
    <div v-else-if="againId && againLoaded && !againSpot" class="again-box" role="status">
      That hangout was never decided, so this is a normal new hangout with the same people.
    </div>
    <div v-if="againDone" class="again-box" role="alert">
      <p class="mb-2">
        Created. Couldn’t add {{ againNotAdded.join(', ') }} (they may have left), so send them the
        invite link from the plan.
      </p>
      <RouterLink class="btn btn-primary" :to="{ name: 'final-plan', params: { id: againDone } }">
        Open the plan →
      </RouterLink>
    </div>

    <!-- (Eashvar) planning with a friend group: everyone's ticked, untick who can't make it -->
    <div v-if="planGroup && !isEdit" class="again-box" role="status">
      <strong>Planning with {{ planGroup.name }}.</strong> Everyone’s ticked under Who’s coming, so
      untick anyone who can’t make it.
      <template v-if="groupStartsCount > 0">
        {{
          groupStartsCount === 1
            ? '1 usual starting point is'
            : `${groupStartsCount} usual starting points are`
        }}
        filled in for you on the next page.
      </template>
    </div>

    <!-- (Surya) edit mode: wait for the hangout, and only the host can change it -->
    <p v-if="isEdit && !editLoaded" class="text-secondary">Loading the hangout…</p>
    <div v-else-if="isEdit && !canEdit" class="again-box" role="alert">
      <p class="mb-2">Only the host can change the hangout’s details.</p>
      <RouterLink class="btn btn-primary" :to="backTo">&larr; Back</RouterLink>
    </div>

    <form v-else id="create-hangout" class="create__grid" novalidate @submit.prevent="submit">
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
        <div v-if="!isEdit" class="switch-row field">
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
        <!-- Who's coming? Ticked friends are added when the hangout is created, or (edit mode)
             when the host saves the changes -->
        <section class="panel">
          <div class="d-flex justify-content-between align-items-baseline gap-2">
            <h2 class="panel__title mb-1">Who’s coming?</h2>
            <span v-if="selectedPeople.length > 0" class="small text-secondary"
              >{{ selectedPeople.length }} picked</span
            >
          </div>

          <!-- (Surya) edit mode: everyone already in. ✕ removes them (after a confirm); the host
               has no ✕ -->
          <ul v-if="members.length > 0" class="picked" aria-label="Already in this hangout">
            <li v-for="m in members" :key="m.user_id" class="picked__chip">
              <MemberAvatar :name="m.display_name" :color="m.avatar_color" :size="24" />
              <span class="picked__name">{{ m.display_name }}</span>
              <span v-if="isHostChip(m)" class="picked__host">host</span>
              <button
                v-else
                type="button"
                class="picked__remove"
                :aria-label="`Remove ${m.display_name} from this hangout`"
                @click="removing = m"
              >
                ✕
              </button>
            </li>
          </ul>
          <p v-if="removeError" class="small text-danger" role="alert">{{ removeError }}</p>

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

          <p v-if="isEdit" class="panel__sub">
            Everyone above is already in (✕ removes someone). Tick friends to add them when you
            save.
          </p>
          <p v-else class="panel__sub">
            Tick your friends and they’re added straight away. Anyone else can join with the Invite
            link on the next page.
          </p>

          <p v-if="withFriend" class="with-friend mb-2">
            Hanging out with <strong>{{ withFriend.display_name }}</strong> (ticked below)
          </p>

          <label for="friend-search" class="visually-hidden">Search anyone on Fairpoint</label>
          <input
            id="friend-search"
            v-model="friendSearch"
            type="search"
            class="form-control mb-2"
            placeholder="Search anyone on Fairpoint"
            autocomplete="off"
            @keydown.enter.prevent="searchEveryone"
          />

          <p v-if="friendsLoading" class="panel__sub mb-0">Loading your friends…</p>
          <p v-else-if="friendsError" class="panel__sub mb-0">{{ friendsError }}</p>

          <!-- Not searching: "Suggested", your first 5 friends to tick -->
          <template v-else-if="!searching">
            <p v-if="friends.length === 0" class="panel__sub mb-0">
              No friends yet. Search for people above, or invite them with the link on the next
              page.
            </p>
            <template v-else-if="visibleFriends.length > 0">
              <p class="list-label">Suggested</p>
              <ul class="people">
                <li v-for="f in visibleFriends" :key="f.user_id">
                  <label
                    class="person"
                    :class="{ 'is-picked': selectedFriends.includes(f.user_id) }"
                  >
                    <MemberAvatar :name="f.display_name" :color="f.avatar_color" :size="32" />
                    <span class="person__name">{{ f.display_name }}</span>
                    <input
                      v-model="selectedFriends"
                      type="checkbox"
                      class="form-check-input person__tick"
                      :value="f.user_id"
                    />
                  </label>
                </li>
              </ul>
            </template>
            <!-- (Surya) edit mode: every friend is already in the hangout -->
            <p v-else class="panel__sub mb-0">
              All your friends are already in. Search above to find someone else.
            </p>
          </template>

          <!-- (Surya) Searching: one list of everyone who matches, closest people first (like
               Instagram). Each row shows what you can do with that person. -->
          <template v-else>
            <template v-if="searchRows.length > 0">
              <p class="panel__sub mb-2">
                Tick friends to add them. Others need to accept a friend request first.
              </p>
              <ul class="people">
                <li v-for="p in searchRows" :key="p.user_id">
                  <!-- a friend: tick to add, like Suggested -->
                  <label
                    v-if="p.status === 'friend'"
                    class="person"
                    :class="{ 'is-picked': selectedFriends.includes(p.user_id) }"
                  >
                    <MemberAvatar :name="p.display_name" :color="p.avatar_color" :size="32" />
                    <span class="person__name">{{ p.display_name }}</span>
                    <input
                      v-model="selectedFriends"
                      type="checkbox"
                      class="form-check-input person__tick"
                      :value="p.user_id"
                    />
                  </label>
                  <div v-else class="person">
                    <MemberAvatar :name="p.display_name" :color="p.avatar_color" :size="32" />
                    <span class="person__name">{{ p.display_name }}</span>
                    <span v-if="p.status === 'member'" class="requested">In hangout</span>
                    <span v-else-if="p.status === 'pending'" class="requested">Requested</span>
                    <!-- they asked you first: one tap makes you friends -->
                    <button
                      v-else-if="p.status === 'request'"
                      type="button"
                      class="btn btn-primary btn-sm request-btn"
                      :aria-label="`Accept ${p.display_name}'s friend request`"
                      @click="acceptRequest(p)"
                    >
                      Accept
                    </button>
                    <button
                      v-else
                      type="button"
                      class="btn btn-outline-primary btn-sm request-btn"
                      :aria-label="`Send ${p.display_name} a friend request`"
                      @click="requestFriend(p)"
                    >
                      Add friend
                    </button>
                  </div>
                </li>
              </ul>
            </template>
            <p v-else-if="friendSearch.trim().length < 2" class="panel__sub mb-0">
              Keep typing to search everyone on Fairpoint.
            </p>
            <p
              v-else-if="!searchingPeople && searchedText === friendSearch.trim()"
              class="panel__sub mb-0"
            >
              Nobody on Fairpoint matches “{{ searchedText }}”.
            </p>
          </template>

          <!-- (Surya) everyone else on Fairpoint who matches, found as you type -->
          <p v-if="searchingPeople" class="panel__sub mb-0">Searching everyone on Fairpoint…</p>
          <p v-if="peopleError" class="small text-danger mb-0" role="alert">{{ peopleError }}</p>
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
            <dd v-if="isEdit">{{ [...memberNames, ...selectedNames].join(', ') }}</dd>
            <dd v-else>
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
            <template v-if="isEdit">Save changes</template>
            <template v-else>Create &amp; add starting points &rarr;</template>
          </button>
          <!-- Why the Create button is greyed out -->
          <p v-if="missingHint && !busy" id="create-hint" class="missing-hint">{{ missingHint }}</p>
          <p v-if="error" class="alert alert-danger py-2 small mt-3 mb-0" role="alert">
            {{ error }}
          </p>
          <RouterLink
            class="btn btn-link btn-cancel w-100"
            :to="isEdit ? backTo : { name: 'dashboard' }"
          >
            Cancel
          </RouterLink>
        </section>
      </div>
    </form>

    <!-- (Surya) "Remove Ryan?" before the host takes someone out of the hangout -->
    <ConfirmDialog
      :open="removing !== null"
      :title="removing ? `Remove ${removing.display_name} from this hangout?` : ''"
      text="Their starting point, transport and vote are removed. You can add them again later."
      button="Remove"
      danger
      @confirm="confirmRemove"
      @cancel="removing = null"
    />
  </main>
</template>

<style scoped>
.create {
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
}

.create__sub {
  margin: 0;
  color: var(--fp-muted);
}

/* (Surya) "↻ Going again to Tiong Bahru Bakery…" */
.again-box {
  margin-bottom: 1.25rem;
  padding: 0.85rem 1rem;
  border: 1px solid var(--fp-primary);
  border-radius: var(--fp-radius-sm);
  background: color-mix(in srgb, var(--fp-primary) 10%, var(--fp-surface));
}

.again-box .btn {
  min-height: 44px;
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

.form-control {
  padding-block: 0.7rem;
  background-color: var(--fp-surface);
  font-size: 0.9rem;
}

.form-control:focus {
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

/* (Surya) "host" on the host's own chip, where the others have ✕ */
.picked__host {
  padding-right: 0.5rem;
  color: var(--fp-muted);
  font-size: 0.75rem;
  font-weight: 600;
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
    top: var(--fp-sticky-top, 5rem); /* (Surya) below the top bars, which now stay on screen */
  }
}

/* (Surya) "SUGGESTED", "YOUR FRIENDS", "OTHERS ON FAIRPOINT" above each list, like the step bar's
   "CHOOSE" and "DECIDE" */
.list-label {
  margin: 0.75rem 0 0.25rem;
  color: var(--fp-muted);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.people {
  max-height: 420px;
  padding: 0;
  margin: 0 0 0.5rem;
  overflow-y: auto;
  list-style: none;
}

/* (Surya) a thin line between people */
.people li + li {
  border-top: 1px solid var(--fp-border);
}

.person {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 48px; /* big enough to tap with a finger */
  padding: 0.5rem 0.75rem;
  border-radius: var(--fp-radius-sm);
  cursor: pointer;
}

label.person:hover {
  background: var(--fp-bg);
}

/* (Surya) a ticked friend's row turns light green */
.person.is-picked,
.person.is-picked:hover {
  background: color-mix(in srgb, var(--fp-primary) 10%, var(--fp-surface));
}

.person .form-check-input {
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
  margin: 0;
}

/* the tick box sits on the right of the row */
.person .person__tick {
  margin-left: auto;
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
