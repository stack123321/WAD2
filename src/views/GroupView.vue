<script setup>
// Owner: Eashvar. One friend group (/groups/:groupId), opened from My Chats.
// The group's chat, the hangouts planned with it (Upcoming and Past) and everyone's usual
// starting point. "Plan a hangout with this group" opens 05 with everyone ticked: untick anyone
// who can't make it, and the usual starting points are filled in on 06 for the rest.
// The owner adds and removes people and can delete the group; anyone else can leave.
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  addGroupMembers,
  deleteGroup,
  getAddablePeople,
  getGroup,
  getGroupHangouts,
  groupUserId,
  removeGroupMember,
  setUsualStart,
  usualTrips,
} from '@/services/groups'
import { sgDate } from '@/utils/dates'
import MemberAvatar from '@/components/voting/MemberAvatar.vue'
import HangoutChat from '@/components/start/HangoutChat.vue'
import GroupHangoutRow from '@/components/groups/GroupHangoutRow.vue'
import GroupPeople from '@/components/groups/GroupPeople.vue'
import PeoplePicker from '@/components/groups/PeoplePicker.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const groupId = route.params.groupId
const myId = computed(() => groupUserId(auth.user))

const group = ref(null)
const hangouts = ref([])
const loading = ref(true)
const error = ref('')
const hangoutsError = ref('')
const actionError = ref('') // a save, add, remove, leave or delete that didn't work

// Part (a) Loading the group and its hangouts
async function loadGroup() {
  const found = await getGroup(groupId)
  if (!found) {
    error.value = 'This group doesn’t exist, or you’re not in it.'
    return
  }
  group.value = found
}

onMounted(async () => {
  try {
    await loadGroup()
  } catch (err) {
    console.error(err)
    error.value = 'Couldn’t load this group.'
  }
  loading.value = false
  if (!group.value) {
    return
  }
  try {
    hangouts.value = await getGroupHangouts(groupId)
  } catch (err) {
    console.error(err)
    hangoutsError.value = 'Couldn’t load the group’s hangouts.'
  }
})

const isOwner = computed(() => Boolean(group.value) && group.value.owner_id === myId.value)
const trips = computed(() => (group.value ? usualTrips(group.value, hangouts.value) : {}))
const planLink = computed(() => ({ name: 'create-hangout', query: { group: groupId } }))

// "4 people" under the name
const memberLine = computed(() => {
  const n = group.value.members.length
  return n === 1 ? 'Just you so far' : `${n} people`
})

// Part (b) Upcoming and Past, split like the dashboard: done, or its day is before today
function isPast(h, today) {
  if (h.status === 'done') {
    return true
  }
  if (!h.starts_at) {
    return false
  }
  return sgDate(new Date(h.starts_at)) < today
}

const tab = ref('upcoming')
const upcoming = computed(() => {
  const today = sgDate(new Date())
  return hangouts.value.filter((h) => !isPast(h, today))
})
const past = computed(() => {
  const today = sgDate(new Date())
  // newest first: the last time you met is the one you look for
  return hangouts.value.filter((h) => isPast(h, today)).reverse()
})
const tabList = computed(() => (tab.value === 'upcoming' ? upcoming.value : past.value))

// Part (c) My usual starting point
const saving = ref(false)

async function saveStart({ place, mode }) {
  actionError.value = ''
  saving.value = true
  try {
    await setUsualStart(groupId, myId.value, place, mode)
    await loadGroup()
  } catch (err) {
    console.error(err)
    actionError.value = err.message || 'Couldn’t save your starting point. Try again.'
  }
  saving.value = false
}

// Part (d) Adding people (owner only)
const adding = ref(false)
const addable = ref([])
const addPicked = ref([])
const addLoading = ref(false)
const addNote = ref('')

async function openAdd() {
  adding.value = true
  addPicked.value = []
  addNote.value = ''
  addLoading.value = true
  try {
    const inGroup = group.value.members.map((m) => m.user_id)
    addable.value = await getAddablePeople(myId.value, inGroup)
  } catch (err) {
    console.error(err)
    addNote.value = 'Couldn’t load your friends. Try again.'
  }
  addLoading.value = false
}

function toggleAdd(userId) {
  if (addPicked.value.includes(userId)) {
    addPicked.value = addPicked.value.filter((id) => id !== userId)
  } else {
    addPicked.value.push(userId)
  }
}

async function addPeople() {
  actionError.value = ''
  try {
    const chosen = addable.value.filter((p) => addPicked.value.includes(p.user_id))
    const notAdded = await addGroupMembers(groupId, chosen)
    await loadGroup()
    adding.value = false
    if (notAdded.length > 0) {
      actionError.value = `Couldn’t add ${notAdded.join(', ')}.`
    }
  } catch (err) {
    console.error(err)
    actionError.value = err.message || 'Couldn’t add them. Try again.'
  }
}

async function removeMember(member) {
  actionError.value = ''
  try {
    await removeGroupMember(groupId, member.user_id)
    await loadGroup()
  } catch (err) {
    console.error(err)
    actionError.value = err.message || 'Couldn’t remove them. Try again.'
  }
}

// Part (e) Leaving or deleting, asked once before it happens
const confirmingEnd = ref(false)

async function endGroup() {
  actionError.value = ''
  try {
    if (isOwner.value) {
      await deleteGroup(groupId)
    } else {
      await removeGroupMember(groupId, myId.value)
    }
    router.push({ name: 'chats' })
  } catch (err) {
    console.error(err)
    actionError.value = err.message || 'That didn’t work. Try again.'
    confirmingEnd.value = false
  }
}
</script>

<template>
  <main class="container py-4 group-page">
    <RouterLink :to="{ name: 'chats' }" class="back">← My Chats</RouterLink>

    <p v-if="loading" class="text-muted mt-3">Loading the group…</p>
    <p v-else-if="error" class="text-danger mt-3">{{ error }}</p>

    <template v-else>
      <header class="head">
        <div class="head__text">
          <p class="eyebrow">Group</p>
          <h1 class="head__name">{{ group.name }}</h1>
          <div class="head__people">
            <span class="avatars" aria-hidden="true">
              <MemberAvatar
                v-for="m in group.members.slice(0, 6)"
                :key="m.user_id"
                :name="m.display_name"
                :color="m.avatar_color"
                :size="28"
              />
            </span>
            <span class="text-muted small">{{ memberLine }}</span>
          </div>
        </div>
        <RouterLink class="btn btn-primary btn-lg plan-btn" :to="planLink">
          Plan a hangout with this group
        </RouterLink>
      </header>

      <p v-if="actionError" class="text-danger" role="alert">{{ actionError }}</p>

      <div class="layout">
        <!-- the hangouts planned with this group -->
        <section class="box area-hangouts" aria-labelledby="hangouts-title">
          <div class="box__head">
            <h2 id="hangouts-title" class="box__title">Hangouts</h2>
            <div class="tabs" role="group" aria-label="Which hangouts">
              <button
                type="button"
                class="tab"
                :class="{ 'is-on': tab === 'upcoming' }"
                :aria-pressed="tab === 'upcoming'"
                @click="tab = 'upcoming'"
              >
                Upcoming <span class="count">{{ upcoming.length }}</span>
              </button>
              <button
                type="button"
                class="tab"
                :class="{ 'is-on': tab === 'past' }"
                :aria-pressed="tab === 'past'"
                @click="tab = 'past'"
              >
                Past <span class="count">{{ past.length }}</span>
              </button>
            </div>
          </div>

          <p v-if="hangoutsError" class="text-danger small mb-0">{{ hangoutsError }}</p>
          <div v-else-if="tabList.length === 0" class="empty">
            <template v-if="tab === 'upcoming'">
              <p class="mb-2">Nothing planned with this group yet.</p>
              <RouterLink class="btn btn-outline-primary btn-tap" :to="planLink">
                Plan the first one
              </RouterLink>
            </template>
            <p v-else class="mb-0">No past hangouts with this group yet.</p>
          </div>
          <div v-else>
            <GroupHangoutRow
              v-for="h in tabList"
              :key="h.id"
              :hangout="h"
              :my-id="myId"
              :group-size="group.members.length"
            />
          </div>
          <p class="small text-muted mt-3 mb-0">
            Hangouts you sat out don’t show here, only the ones you’re in.
          </p>
        </section>

        <!-- the group's own chat, kept across all its hangouts -->
        <div class="area-chat">
          <HangoutChat :group="group" :my-id="myId" :height="380" title="Group chat" />
        </div>

        <!-- everyone, with their usual starting point -->
        <section class="box area-people" aria-labelledby="people-title">
          <div class="box__head">
            <h2 id="people-title" class="box__title">People</h2>
            <button
              v-if="isOwner && !adding"
              type="button"
              class="btn btn-outline-primary btn-tap"
              @click="openAdd"
            >
              + Add people
            </button>
          </div>
          <p class="small text-muted">
            Usual starting points fill in 06 when you plan with the group. Anyone can still change
            theirs for one hangout.
          </p>

          <div v-if="adding" class="add-panel">
            <p v-if="addLoading" class="small text-muted mb-0">Loading your friends…</p>
            <p v-else-if="addNote" class="small text-danger mb-0">{{ addNote }}</p>
            <p v-else-if="addable.length === 0" class="small text-muted mb-0">
              All your friends are already in this group.
            </p>
            <PeoplePicker
              v-else
              :people="addable"
              :picked="addPicked"
              id-prefix="add"
              @toggle="toggleAdd"
            />
            <div class="add-panel__actions">
              <button type="button" class="btn btn-link btn-tap" @click="adding = false">
                Cancel
              </button>
              <button
                type="button"
                class="btn btn-primary btn-tap"
                :disabled="addPicked.length === 0"
                @click="addPeople"
              >
                Add {{ addPicked.length || '' }}
              </button>
            </div>
          </div>

          <GroupPeople
            :group="group"
            :trips="trips"
            :my-id="myId"
            :is-owner="isOwner"
            :saving="saving"
            @save-start="saveStart"
            @remove="removeMember"
          />

          <div class="end">
            <button
              v-if="!confirmingEnd"
              type="button"
              class="btn btn-link text-danger btn-tap"
              @click="confirmingEnd = true"
            >
              {{ isOwner ? 'Delete group' : 'Leave group' }}
            </button>
            <div v-else class="end__confirm" role="group">
              <span class="small">
                {{
                  isOwner
                    ? 'Delete the group and its chat? Its hangouts stay.'
                    : 'Leave this group? You stay in its hangouts.'
                }}
              </span>
              <button type="button" class="btn btn-danger btn-tap" @click="endGroup">
                {{ isOwner ? 'Delete' : 'Leave' }}
              </button>
              <button type="button" class="btn btn-link btn-tap" @click="confirmingEnd = false">
                Cancel
              </button>
            </div>
          </div>
        </section>
      </div>
    </template>
  </main>
</template>

<style scoped>
.group-page {
  max-width: 1120px;
}

.back {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
}

.head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem 2rem;
  margin: 0.5rem 0 1.5rem;
}

.head__text {
  min-width: 0;
}

.eyebrow {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--fp-primary);
}

.head__name {
  margin: 0.1rem 0 0.5rem;
  font-size: clamp(1.75rem, 4vw, 2.25rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  overflow-wrap: anywhere;
}

.head__people {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.avatars {
  display: flex;
}

.avatars > * + * {
  margin-left: -8px;
}

.plan-btn {
  min-height: 48px;
  display: inline-flex;
  align-items: center;
}

/* phones: hangouts, then the chat, then people. wide screens: the chat runs down the right */
.layout {
  display: grid;
  gap: 1.25rem;
  grid-template-areas:
    'hangouts'
    'chat'
    'people';
}

.area-hangouts {
  grid-area: hangouts;
}

.area-chat {
  grid-area: chat;
}

.area-people {
  grid-area: people;
}

@media (min-width: 992px) {
  .layout {
    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
    grid-template-areas:
      'hangouts chat'
      'people chat';
    align-items: start;
  }

  .area-chat {
    position: sticky;
    top: 1rem;
  }
}

.box {
  background: var(--fp-surface);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
  box-shadow: var(--fp-shadow);
  padding: 1.25rem 1.5rem;
  min-width: 0;
}

.box__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 1rem;
  margin-bottom: 0.5rem;
}

.box__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
}

.tabs {
  display: inline-flex;
  padding: 3px;
  border-radius: 999px;
  background: var(--fp-bg);
  border: 1px solid var(--fp-border);
}

.tab {
  min-height: 40px;
  padding: 0 1rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--fp-muted);
  font-weight: 700;
}

.tab.is-on {
  background: var(--fp-surface);
  color: var(--fp-ink);
  box-shadow: var(--fp-shadow);
}

.count {
  margin-left: 0.25rem;
  font-weight: 600;
  color: var(--fp-muted);
}

.empty {
  padding: 1.25rem 0 0.5rem;
  color: var(--fp-muted);
}

.btn-tap {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
}

.add-panel {
  margin-bottom: 1rem;
  padding: 1rem;
  border-radius: var(--fp-radius-sm);
  background: var(--fp-bg);
  border: 1px solid var(--fp-border);
}

.add-panel__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.end {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--fp-border);
}

.end__confirm {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}
</style>
