<script setup>
// Hangout chat
// Owner: Ryan
// one hangout's chat on its own page, opened from my chats (chat itself: components/chat/HangoutChat.vue)
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getHangout } from '@/services/hangouts'
import { isMockHangout } from '@/services/votes'
import { getStatus } from '@/utils/hangoutStatus'
import HangoutChat from '@/components/chat/HangoutChat.vue'

const route = useRoute()
const auth = useAuthStore()
const hangout = ref(null)
const error = ref('')

// the sample hangouts have no real members, so anyone can open them in the demo
const isMember = computed(() => {
  if (!hangout.value) return false
  if (isMockHangout(hangout.value.id)) return true
  return hangout.value.members.some((m) => m.user_id === auth.user?.id)
})

// (Nicole) "Continue planning" goes to the step the hangout is up to (the same page the dashboard opens)
const nextPage = computed(() => {
  if (!hangout.value || !isMember.value) return null
  return getStatus(hangout.value, auth.user?.id).page
})

onMounted(async () => {
  try {
    hangout.value = await getHangout(route.params.hangoutId) // the id from the address, /chats/<id>
  } catch (err) {
    console.error(err)
    error.value = 'Could not load this chat.'
  }
})
</script>

<template>
  <main class="container py-4 chat-page">
    <!-- passes on this hangout, so My Chats can offer the way back into planning too -->
    <router-link :to="{ name: 'chats', query: { hangout: route.params.hangoutId } }" class="small">
      ← My Chats
    </router-link>

    <p v-if="error" class="text-danger mt-3">{{ error }}</p>
    <template v-else-if="hangout">
      <h1 class="page-title mt-2 mb-3">{{ hangout.name }}</h1>
      <!-- the chat box itself is surya's component, this page only checks i'm allowed to see it -->
      <HangoutChat v-if="isMember" :hangout="hangout" :height="420" title="Chat" />
      <p v-else class="text-muted">Only people in this hangout can see its chat.</p>

      <div v-if="nextPage" class="planning-links">
        <router-link class="btn btn-primary" :to="{ name: nextPage, params: { id: hangout.id } }">
          Continue planning →
        </router-link>
      </div>
    </template>
  </main>
</template>

<style scoped>
.chat-page {
  max-width: 720px;
}

/* "Continue planning →" under the chat */
.planning-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}

.planning-links .btn {
  min-height: 44px; /* easy to tap on a phone */
  display: inline-flex;
  align-items: center;
}
</style>
