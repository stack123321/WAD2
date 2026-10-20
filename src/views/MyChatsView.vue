<script setup>
// Owner: Ryan
// my chats: one row per hangout and per one to one chat, search by chat or person name
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getMyHangouts } from '@/services/hangouts'
import { getMyDirectChats } from '@/services/directChats'
import MemberAvatar from '@/components/voting/MemberAvatar.vue'

const auth = useAuthStore()
// each is { key, name, members, to }, hangout chats first and then one to one chats
const chats = ref([])
const loading = ref(false)
const error = ref('')
const query = ref('')

onMounted(async () => {
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
