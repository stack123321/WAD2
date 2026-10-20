<script setup>
// Owner: Surya. /groups/:groupId: one friend group's page. The group chat stays here across all
// the group's hangouts. The owner adds friends; anyone in the group can start a hangout with
// everyone in it. (The route param is groupId, not id: App.vue treats :id as a hangout.)
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  addGroupMember,
  deleteGroup,
  getGroup,
  removeGroupMember,
  startGroupHangout,
} from '@/services/groups'
import { getPastFriends } from '@/services/hangouts'
import { getFriendships } from '@/services/friends'
import { useAuthStore } from '@/stores/auth'
import HangoutChat from '@/components/start/HangoutChat.vue'
import MemberAvatar from '@/components/voting/MemberAvatar.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const myId = auth.user ? auth.user.id : null

const group = ref(null)
const loading = ref(true)
const error = ref('')

const isOwner = computed(() => group.value && group.value.owner_id === myId)

// Part (a) Load the group (and, for the owner, the friends they could add)
async function loadGroup() {
  error.value = ''
  try {
    group.value = await getGroup(route.params.groupId)
  } catch (err) {
    console.error(err)
    error.value = err.message || "Couldn't load this group."
  }
  loading.value = false
}

onMounted(async () => {
  await loadGroup()
  if (isOwner.value) {
    loadFriends()
  }
})

// Part (b) Owner: add friends (accepted friends + people from past hangouts, once each)
const friends = ref([])
const selected = ref([]) // user_ids of the ticked friends
const adding = ref(false)
const addMessage = ref('')
const addError = ref('')

async function loadFriends() {
  try {
    const lists = await getFriendships(myId)
    const past = await getPastFriends(myId)
    const all = [...lists.friends]
    for (const person of past) {
      const existing = all.find((f) => f.user_id === person.user_id)
      if (!existing) {
        all.push(person)
      }
    }
    friends.value = all
  } catch (err) {
    console.error(err)
    addError.value = "Couldn't load your friends."
  }
}

// Only friends who aren't in the group yet
const notYetIn = computed(() => {
  const result = []
  for (const friend of friends.value) {
    const alreadyIn = group.value.members.find((m) => m.user_id === friend.user_id)
    if (!alreadyIn) {
      result.push(friend)
    }
  }
  return result
})

async function addSelected() {
  addMessage.value = ''
  addError.value = ''
  if (selected.value.length === 0) {
    return
  }
  adding.value = true

  const failed = []
  let added = 0
  for (const userId of selected.value) {
    try {
      await addGroupMember(group.value.id, userId)
      added++
    } catch (err) {
      console.error(err)
      const friend = friends.value.find((f) => f.user_id === userId)
      failed.push(friend ? friend.display_name : 'someone')
    }
  }

  selected.value = []
  adding.value = false
  if (added > 0) {
    addMessage.value = added === 1 ? 'Added 1 friend.' : `Added ${added} friends.`
    await loadGroup()
  }
  if (failed.length > 0) {
    addError.value = `Couldn't add ${failed.join(', ')}.`
  }
}

// Part (c) Owner removes someone; anyone can leave; the owner can delete the group
async function remove(member) {
  const sure = window.confirm(`Remove ${member.display_name} from ${group.value.name}?`)
  if (!sure) {
    return
  }
  try {
    await removeGroupMember(group.value.id, member.user_id)
    await loadGroup()
  } catch (err) {
    console.error(err)
    addError.value = `Couldn't remove ${member.display_name}.`
  }
}

async function leave() {
  const sure = window.confirm(`Leave ${group.value.name}? You won't see its chat any more.`)
  if (!sure) {
    return
  }
  try {
    await removeGroupMember(group.value.id, myId)
    router.push({ name: 'groups' })
  } catch (err) {
    console.error(err)
    error.value = "Couldn't leave the group."
  }
}

async function removeGroup() {
  const sure = window.confirm(`Delete ${group.value.name} and its chat? Its hangouts are kept.`)
  if (!sure) {
    return
  }
  try {
    await deleteGroup(group.value.id)
    router.push({ name: 'groups' })
  } catch (err) {
    console.error(err)
    error.value = "Couldn't delete the group."
  }
}

// Part (d) Start a hangout with everyone in the group
const hangoutName = ref('')
const hangoutTime = ref('') // from <input type="datetime-local">, e.g. "2026-10-24T19:00"
const starting = ref(false)
const startError = ref('')

async function startHangout() {
  startError.value = ''
  if (hangoutName.value.trim() === '') {
    startError.value = 'Give the hangout a name.'
    return
  }
  if (hangoutTime.value === '') {
    startError.value = 'Pick a date and time.'
    return
  }
  if (new Date(hangoutTime.value) < new Date()) {
    startError.value = 'Pick a time in the future.'
    return
  }

  starting.value = true
  try {
    const result = await startGroupHangout(
      group.value,
      { name: hangoutName.value.trim(), starts_at: new Date(hangoutTime.value).toISOString() },
      myId,
    )
    if (result.failed.length > 0) {
      window.alert(`Made the hangout, but couldn't add ${result.failed.join(', ')}.`)
    }
    router.push({ name: 'starting-points', params: { id: result.hangout.id } })
  } catch (err) {
    console.error(err)
    startError.value = err.message || "Couldn't start the hangout."
  }
  starting.value = false
}

// "Fri 24 Oct"
function dateLabel(when) {
  if (!when) {
    return 'No date yet'
  }
  return new Date(when)
    .toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })
    .replace(',', '')
}
</script>

<template>
  <main class="container py-4">
    <router-link :to="{ name: 'groups' }" class="small">← Friend groups</router-link>

    <p v-if="loading" class="text-secondary mt-3">Loading the group…</p>
    <p v-else-if="error && !group" class="text-danger mt-3" role="alert">{{ error }}</p>

    <template v-else-if="group">
      <div class="d-flex flex-wrap align-items-center gap-2 mt-2 mb-3">
        <h1 class="mb-0 me-auto">{{ group.name }}<span aria-hidden="true">.</span></h1>
        <button
          v-if="isOwner"
          type="button"
          class="btn btn-outline-danger btn-sm tap"
          @click="removeGroup"
        >
          Delete group
        </button>
        <button v-else type="button" class="btn btn-outline-secondary btn-sm tap" @click="leave">
          Leave group
        </button>
      </div>
      <p v-if="error" class="text-danger small" role="alert">{{ error }}</p>

      <div class="row g-4">
        <!-- Chat: the main thing on this page -->
        <div class="col-lg-7">
          <HangoutChat :group="group" :title="`${group.name} chat`" :height="420" />
        </div>

        <div class="col-lg-5 d-grid gap-3 align-content-start">
          <!-- Start a hangout -->
          <form class="box" @submit.prevent="startHangout">
            <h2 class="h6 fw-bold">Start a hangout</h2>
            <p class="small text-secondary">Everyone in the group is added straight away.</p>
            <label for="hangout-name" class="form-label small fw-semibold">Name</label>
            <input
              id="hangout-name"
              v-model="hangoutName"
              class="form-control mb-2"
              type="text"
              maxlength="80"
              placeholder="e.g. Friday dinner"
            />
            <label for="hangout-time" class="form-label small fw-semibold">When</label>
            <input
              id="hangout-time"
              v-model="hangoutTime"
              class="form-control mb-2"
              type="datetime-local"
            />
            <button type="submit" class="btn btn-primary w-100 tap" :disabled="starting">
              {{ starting ? 'Starting…' : 'Start hangout' }}
            </button>
            <p v-if="startError" class="small text-danger mt-2 mb-0" role="alert">
              {{ startError }}
            </p>
          </form>

          <!-- Members -->
          <section class="box">
            <h2 class="h6 fw-bold">Members ({{ group.members.length }})</h2>
            <ul class="list-unstyled mb-0">
              <li v-for="m in group.members" :key="m.user_id" class="person">
                <MemberAvatar :name="m.display_name" :color="m.avatar_color" :size="32" />
                <span class="flex-grow-1 text-truncate">
                  {{ m.display_name }}
                  <span v-if="m.user_id === myId" class="text-secondary">(you)</span>
                  <span v-if="m.user_id === group.owner_id" class="small text-secondary">
                    · owner</span
                  >
                </span>
                <button
                  v-if="isOwner && m.user_id !== myId"
                  type="button"
                  class="btn btn-link btn-sm text-danger tap"
                  :aria-label="`Remove ${m.display_name}`"
                  @click="remove(m)"
                >
                  Remove
                </button>
              </li>
            </ul>

            <!-- Owner: add friends -->
            <template v-if="isOwner">
              <h3 class="h6 fw-bold mt-3">Add friends</h3>
              <p v-if="notYetIn.length === 0" class="small text-secondary mb-0">
                Your friends (Friends page or past hangouts) who aren't in the group show up here.
              </p>
              <template v-else>
                <ul class="list-unstyled mb-0">
                  <li v-for="f in notYetIn" :key="f.user_id">
                    <label class="person friend">
                      <input
                        v-model="selected"
                        type="checkbox"
                        class="form-check-input"
                        :value="f.user_id"
                        :disabled="adding"
                      />
                      <MemberAvatar :name="f.display_name" :color="f.avatar_color" :size="32" />
                      <span class="text-truncate">{{ f.display_name }}</span>
                    </label>
                  </li>
                </ul>
                <button
                  type="button"
                  class="btn btn-outline-primary w-100 mt-2 tap"
                  :disabled="adding || selected.length === 0"
                  @click="addSelected"
                >
                  <span v-if="adding">Adding…</span>
                  <span v-else-if="selected.length > 1">Add {{ selected.length }} friends</span>
                  <span v-else>Add selected</span>
                </button>
              </template>
              <p v-if="addMessage" class="small save-ok mt-2 mb-0">✓ {{ addMessage }}</p>
              <p v-if="addError" class="small text-danger mt-2 mb-0" role="alert">
                {{ addError }}
              </p>
            </template>
          </section>

          <!-- This group's hangouts -->
          <section class="box">
            <h2 class="h6 fw-bold">Hangouts</h2>
            <p v-if="group.hangouts.length === 0" class="small text-secondary mb-0">
              None yet. Start one above.
            </p>
            <ul v-else class="list-unstyled mb-0">
              <li v-for="h in group.hangouts" :key="h.id">
                <router-link
                  :to="{ name: 'starting-points', params: { id: h.id } }"
                  class="person hangout-link"
                >
                  <span class="flex-grow-1 text-truncate fw-semibold">{{ h.name }}</span>
                  <span class="small text-secondary text-nowrap">{{ dateLabel(h.starts_at) }}</span>
                </router-link>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </template>
  </main>
</template>

<style scoped>
.box {
  padding: 1rem;
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius-sm);
  background: var(--fp-surface);
}

.person {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 44px; /* big enough to tap with a finger */
  min-width: 0;
}

.friend {
  cursor: pointer;
}

.friend .form-check-input {
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
  margin: 0;
}

.hangout-link {
  color: var(--fp-ink);
  text-decoration: none;
}

.hangout-link:hover {
  color: var(--fp-primary);
}

.tap {
  min-height: 44px;
}

.save-ok {
  color: var(--fp-primary);
  font-weight: 600;
}
</style>
