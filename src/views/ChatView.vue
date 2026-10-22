<script setup>
// Owner: Ryan
// one hangout's chat on its own page, opened from my chats (chat itself: components/start/HangoutChat.vue)
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getHangout } from '@/services/hangouts'
import { isMockHangout } from '@/services/votes'
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
    <router-link :to="{ name: 'chats' }" class="small">← My Chats</router-link>

    <p v-if="error" class="text-danger mt-3">{{ error }}</p>
    <template v-else-if="hangout">
      <h1 class="h3 mt-2 mb-3">{{ hangout.name }}</h1>
      <HangoutChat v-if="isMember" :hangout="hangout" :height="420" title="Chat" />
      <p v-else class="text-muted">Only people in this hangout can see its chat.</p>
    </template>
  </main>
</template>

<style scoped>
.chat-page {
  max-width: 720px;
}
</style>
