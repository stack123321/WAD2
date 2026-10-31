<script setup>
// Owner: Ryan
// my chats: one row per hangout and per one to one chat, search by chat or person name
// (Eashvar) friend groups on top, each opening its own page (/groups/:id), and a "New group" button
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAlertsStore } from '@/stores/alerts'
import { getHangout, getMyHangouts } from '@/services/hangouts'
import { getMyDirectChats } from '@/services/directChats'
import { getMyGroups } from '@/services/groups'
import { planningLinks } from '@/utils/planningLinks'
import MemberAvatar from '@/components/voting/MemberAvatar.vue'

const route = useRoute()
const auth = useAuthStore()
const alerts = useAlertsStore() // unread counts, kept fresh by the navbar

// (Nicole) Came here from a hangout's chat (?hangout=<id>, and ?from= the planning page before
// that): a banner offers the way back into planning, so nobody gets stuck in the chats
const planning = ref(null) // { hangout, links } or null

async function loadPlanning() {
  if (!route.query.hangout) return
  try {
    const hangout = await getHangout(route.query.hangout)
    const links = planningLinks(hangout, auth.user?.id, route.query.from)
    if (links.back || links.next) {
      planning.value = { hangout: hangout, links: links }
    }
  } catch (err) {
    console.log(err) // no banner, the list still works
  }
}
// each is { key, name, members, to }, hangout chats first and then one to one chats
const chats = ref([])
const loading = ref(false)
const error = ref('')
const query = ref('')

// (Eashvar) my friend groups, as the same row shape. Loaded on their own, so the chats still show
// if groups can't load
const groups = ref([])
const groupsError = ref('')

async function loadGroups() {
  try {
    const mine = await getMyGroups()
    groups.value = mine.map((g) => ({
      key: g.id,
      name: g.name,
      members: g.members,
      to: { name: 'group', params: { groupId: g.id } },
    }))
  } catch (err) {
    console.log(err)
    groupsError.value = 'Could not load your groups.'
  }
}

onMounted(async () => {
  loadPlanning() // not awaited, the banner appears when ready
  loadGroups() // not awaited either, the groups appear when ready
  loading.value = true
  // hangout chats and one to one chats come from different tables, so both are loaded and turned into the same row shape for one list.
  try {
    const hangouts = await getMyHangouts()
    const directs = await getMyDirectChats(auth.user?.id) // ?. gives undefined instead of an error if nobody is logged in
    for (let h of hangouts) {
      chats.value.push({
        key: h.id,
        name: h.name,
        members: h.members,
        to: { name: 'chat', params: { hangoutId: h.id } },
        groupId: h.group_id ?? null, // (Eashvar) planned with a friend group: its name shows as a tag
      })
    }
    for (let d of directs) {
      chats.value.push({
        key: d.id,
        name: d.friend.display_name,
        members: [d.friend], // just the friend's avatar
        to: { name: 'direct-chat', params: { chatId: d.id } },
      })
    }
  } catch (err) {
    console.log(err)
    error.value = 'Could not load your chats.'
  }
  loading.value = false
})

// chats whose name or any member's name contains the search text, all of them when it is empty,
// newest message first like a messaging app. Chats with no messages keep their old order at the
// bottom (sort keeps the order of equal items), and filter makes a new list so chats isn't reordered
function matches(c, text) {
  if (c.name.toLowerCase().includes(text)) return true // the chat's name matches
  return c.members.some((m) => m.display_name.toLowerCase().includes(text)) // or someone in it
}

const shown = computed(() => {
  const text = query.value.trim().toLowerCase() // lowercase both sides, so "mei" finds "Mei"
  const matching = chats.value.filter((c) => matches(c, text))
  // b minus a puts the bigger (newer) time first
  return matching.sort((a, b) => alerts.lastMessageAt(b.key) - alerts.lastMessageAt(a.key))
})

// (Eashvar) the groups, searched and ordered the same way
const shownGroups = computed(() => {
  const text = query.value.trim().toLowerCase()
  const matching = groups.value.filter((g) => matches(g, text))
  return matching.sort((a, b) => alerts.lastMessageAt(b.key) - alerts.lastMessageAt(a.key))
})

// (Eashvar) a group's name from its id, for the tag on its hangouts' chats
function groupName(groupId) {
  const found = groups.value.find((g) => g.key === groupId)
  return found ? found.name : ''
}
</script>

<template>
  <main class="container py-4 chats-page">
    <h1 class="h3 mt-2 mb-3">My Chats</h1>

    <div v-if="planning" class="planning-banner mb-3" role="region" aria-label="Back to planning">
      <span class="planning-text">Still planning “{{ planning.hangout.name }}”?</span>
      <span class="planning-actions">
        <router-link
          v-if="planning.links.back"
          class="btn btn-outline-primary"
          :to="{ name: planning.links.back.page, params: { id: planning.hangout.id } }"
        >
          ← Back to {{ planning.links.back.label }}
        </router-link>
        <router-link
          v-if="planning.links.next"
          class="btn btn-primary"
          :to="{ name: planning.links.next.page, params: { id: planning.hangout.id } }"
        >
          Continue planning →
        </router-link>
      </span>
    </div>

    <!-- filters as you type (v-model), @submit.prevent stops enter from reloading the page -->
    <form class="mb-3" role="search" @submit.prevent>
      <label for="chat-search" class="visually-hidden">Search by hangout or person</label>
      <input
        id="chat-search"
        v-model="query"
        type="search"
        class="form-control search-box"
        placeholder="Search by hangout or person"
      />
    </form>

    <!-- (Eashvar) friend groups: one chat each, plus the hangouts planned with them -->
    <section class="box mb-3" aria-labelledby="groups-title">
      <div class="section-head">
        <h2 id="groups-title" class="section-title">Groups</h2>
        <router-link class="btn btn-outline-primary new-group" :to="{ name: 'new-group' }">
          + New group
        </router-link>
      </div>
      <p v-if="groupsError" class="text-danger small mb-0">{{ groupsError }}</p>
      <p v-else-if="shownGroups.length === 0" class="text-muted small mb-0">
        {{
          query.trim()
            ? 'No groups found.'
            : 'No groups yet. Make one for the friends you meet often.'
        }}
      </p>
      <router-link
        v-for="g in shownGroups"
        :key="g.key"
        :to="g.to"
        class="person text-decoration-none"
      >
        <span class="name" :class="{ unread: alerts.unreadIn(g.key) > 0 }">{{ g.name }}</span>
        <span v-if="alerts.unreadIn(g.key) > 0" class="badge rounded-pill bg-danger">
          {{ alerts.unreadIn(g.key) }}
          <span class="visually-hidden">new</span>
        </span>
        <span class="avatars">
          <MemberAvatar
            v-for="m in g.members.slice(0, 5)"
            :key="m.user_id"
            :name="m.display_name"
            :color="m.avatar_color"
            :size="32"
          />
        </span>
      </router-link>
    </section>

    <p v-if="loading" class="text-muted">Loading your chats…</p>
    <p v-else-if="error" class="text-danger">{{ error }}</p>

    <section v-else id="chat-list" class="box">
      <p v-if="shown.length === 0" class="text-muted small mb-0">No chats found.</p>
      <!-- each row: name in bold if unread, a red count, and everyone's avatars -->
      <router-link v-for="c in shown" :key="c.key" :to="c.to" class="person text-decoration-none">
        <span class="name" :class="{ unread: alerts.unreadIn(c.key) > 0 }">{{ c.name }}</span>
        <span v-if="c.groupId && groupName(c.groupId)" class="group-tag">{{
          groupName(c.groupId)
        }}</span>
        <span v-if="alerts.unreadIn(c.key) > 0" class="badge rounded-pill bg-danger">
          {{ alerts.unreadIn(c.key) }}
          <span class="visually-hidden">new</span>
        </span>
        <span class="avatars">
          <MemberAvatar
            v-for="m in c.members"
            :key="m.user_id"
            :name="m.display_name"
            :color="m.avatar_color"
            :size="32"
          />
        </span>
      </router-link>
    </section>
  </main>
</template>

<style scoped>
.chats-page {
  max-width: 720px;
}

/* "Still planning …?" with the way back, above the list */
.planning-banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
  background: var(--fp-surface);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
  padding: 0.85rem 1.25rem;
}

.planning-text {
  font-weight: 600;
}

.planning-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-left: auto;
}

.planning-actions .btn {
  min-height: 44px; /* easy to tap on a phone */
  display: inline-flex;
  align-items: center;
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
  color: inherit;
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

/* a chat with new messages: darker and bolder, like an unread email */
.name.unread {
  font-weight: 800;
  color: var(--fp-ink);
}

/* (Eashvar) the Groups heading with New group beside it */
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
}

.section-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
}

.new-group {
  min-height: 44px; /* easy to tap on a phone */
  display: inline-flex;
  align-items: center;
}

/* which group a hangout was planned with */
.group-tag {
  padding: 0.1rem 0.55rem;
  border-radius: 999px;
  background: var(--fp-bg);
  border: 1px solid var(--fp-border);
  color: var(--fp-muted);
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

/* white with a darker edge, so the search box stands out from the page */
.form-control.search-box {
  background: var(--fp-surface);
  border-color: var(--fp-muted);
  min-height: 44px; /* easy to tap on a phone */
}

.avatars {
  display: flex;
  margin-left: auto;
}

/* overlap the circles like on the dashboard cards */
.avatars > * + * {
  margin-left: -8px;
}
</style>
