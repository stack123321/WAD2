<script setup>
// Owner: Ryan
// one hangout's chat on its own page, opened from my chats (chat itself: components/start/HangoutChat.vue)
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getHangout } from '@/services/hangouts'
import { isMockHangout } from '@/services/votes'
import { planningLinks } from '@/utils/planningLinks'
import HangoutChat from '@/components/start/HangoutChat.vue'

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

// (Nicole) Ways back into planning, e.g. "← Back to Transport" after Remind on 07
const links = computed(() => {
  if (!hangout.value || !isMember.value) return { back: null, next: null }
  return planningLinks(hangout.value, auth.user?.id, route.query.from)
})

onMounted(async () => {
  try {
    hangout.value = await getHangout(route.params.hangoutId)
  } catch (err) {
    console.log(err)
    error.value = 'Could not load this chat.'
  }
})
</script>

<template>
  <main class="container py-4 chat-page">
    <!-- passes on where you came from, so My Chats can offer the way back too -->
    <router-link
      :to="{ name: 'chats', query: { from: route.query.from, hangout: route.params.hangoutId } }"
      class="small"
    >
      ← My Chats
    </router-link>

    <p v-if="error" class="text-danger mt-3">{{ error }}</p>
    <template v-else-if="hangout">
      <h1 class="h3 mt-2 mb-3">{{ hangout.name }}</h1>
      <HangoutChat v-if="isMember" :hangout="hangout" :height="420" title="Chat" />
      <p v-else class="text-muted">Only people in this hangout can see its chat.</p>

      <div v-if="links.back || links.next" class="planning-links">
        <router-link
          v-if="links.back"
          class="btn btn-outline-primary"
          :to="{ name: links.back.page, params: { id: hangout.id } }"
        >
          ← Back to {{ links.back.label }}
        </router-link>
        <router-link
          v-if="links.next"
          class="btn btn-primary"
          :to="{ name: links.next.page, params: { id: hangout.id } }"
        >
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

/* "← Back to Transport" / "Continue planning →" under the chat */
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
