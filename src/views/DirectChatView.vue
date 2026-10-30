<script setup>
// Owner: Ryan
// one to one chat with a friend, opened from my chats or the friends page (chat box: components/start/HangoutChat.vue)
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getDirectChat } from '@/services/directChats'
import HangoutChat from '@/components/start/HangoutChat.vue'
import PageBand from '@/components/ui/PageBand.vue'

const route = useRoute()
const auth = useAuthStore()
const chat = ref(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    chat.value = await getDirectChat(route.params.chatId, auth.user?.id) // the id from the address
    if (!chat.value) {
      // null: not my chat, or it doesn't exist
      error.value = 'Could not find this chat.'
    }
  } catch (err) {
    console.log(err)
    error.value = 'Could not load this chat.'
  }
  loading.value = false // runs after both success and failure
})
</script>

<template>
  <main>
    <PageBand
      :title="chat ? chat.friend.display_name : 'Chat'"
      size="short"
      :back="{ to: { name: 'chats' }, label: 'My Chats' }"
    />

    <div class="container fp-pull chat-page">
      <p v-if="loading" class="text-muted mt-3">Loading the chat…</p>
      <p v-else-if="error" class="text-danger mt-3">{{ error }}</p>
      <template v-else>
        <!-- the same chat box as hangouts, given :direct instead of :hangout -->
        <HangoutChat :direct="chat" :height="420" title="Chat" />
      </template>
    </div>
  </main>
</template>

<style scoped>
.chat-page {
  max-width: 720px;
}
</style>
