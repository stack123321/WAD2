<script setup>
// Owner: Ryan
// my chats: one row per hangout and per one to one chat, search by chat or person name
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getHangout, getMyHangouts } from '@/services/hangouts'
import { getMyDirectChats } from '@/services/directChats'
import { planningLinks } from '@/utils/planningLinks'
import MemberAvatar from '@/components/voting/MemberAvatar.vue'

const route = useRoute()
const auth = useAuthStore()

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

onMounted(async () => {
  loadPlanning()
  loading.value = true
  try {
    const hangouts = await getMyHangouts()
    const directs = await getMyDirectChats(auth.user?.id)
    for (let h of hangouts) {
      chats.value.push({
        key: h.id,
        name: h.name,
        members: h.members,
        to: { name: 'chat', params: { hangoutId: h.id } },
      })
    }
    for (let d of directs) {
      chats.value.push({
        key: d.id,
        name: d.friend.display_name,
        members: [d.friend],
        to: { name: 'direct-chat', params: { chatId: d.id } },
      })
    }
  } catch (err) {
    console.log(err)
    error.value = 'Could not load your chats.'
  }
  loading.value = false
})

// chats whose name or any member's name contains the search text, all of them when it is empty
const shown = computed(() => {
  const text = query.value.trim().toLowerCase()
  return chats.value.filter((c) => {
    if (c.name.toLowerCase().includes(text)) return true
    return c.members.some((m) => m.display_name.toLowerCase().includes(text))
  })
})
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

    <form class="mb-3" role="search" @submit.prevent>
      <label for="chat-search" class="visually-hidden">Search by hangout or person</label>
      <input
        id="chat-search"
        v-model="query"
        type="search"
        class="form-control"
        placeholder="Search by hangout or person"
      />
    </form>

    <p v-if="loading" class="text-muted">Loading your chats…</p>
    <p v-else-if="error" class="text-danger">{{ error }}</p>

    <section v-else id="chat-list" class="box">
      <p v-if="shown.length === 0" class="text-muted small mb-0">No chats found.</p>
      <router-link v-for="c in shown" :key="c.key" :to="c.to" class="person text-decoration-none">
        <span class="name">{{ c.name }}</span>
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

.avatars {
  display: flex;
  margin-left: auto;
}

/* overlap the circles like on the dashboard cards */
.avatars > * + * {
  margin-left: -8px;
}
</style>
