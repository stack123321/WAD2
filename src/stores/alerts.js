// Owner: Ryan
// the red badges in the navbar: friend requests waiting for me, and unread chat messages.
// also when each chat's newest message was sent, so My Chats can put the newest first
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getFriendships } from '@/services/friends'
import { getChatSummary } from '@/services/unread'

export const useAlertsStore = defineStore('alerts', () => {
  const friendRequests = ref(0)
  const summary = ref([]) // [{ chat_id, unread, last_at }], one per chat with messages
  const openChatId = ref(null) // the chat on screen right now, never counted as unread

  // unread messages in one chat (My Chats shows it on each row)
  function unreadIn(chatId) {
    if (chatId === openChatId.value) return 0
    const row = summary.value.find((r) => r.chat_id === chatId)
    return row ? row.unread : 0
  }

  // when the newest message in a chat was sent, 0 if it has none (My Chats sorts by this)
  function lastMessageAt(chatId) {
    const row = summary.value.find((r) => r.chat_id === chatId)
    return row ? new Date(row.last_at).getTime() : 0
  }

  // unread messages across all my chats, for the badge on Chats
  const unreadTotal = computed(() => {
    let total = 0
    for (let row of summary.value) {
      if (row.chat_id !== openChatId.value) total += row.unread
    }
    return total
  })

  // ask the database again (after a page change, a new message, or reading a chat)
  // a page change and a new message can ask at the same time: only the newest answer is used
  let latest = 0

  async function refresh(myId) {
    latest = latest + 1
    const mine = latest
    try {
      const lists = await getFriendships(myId)
      const chats = await getChatSummary()
      if (mine !== latest) return
      friendRequests.value = lists.requests.length
      summary.value = chats
    } catch (err) {
      // the badges are a nice extra: if this fails, keep the numbers we had
      console.log(err)
    }
  }

  // a chat came on screen (HangoutChat calls these two)
  function openChat(chatId) {
    openChatId.value = chatId
  }

  // left the chat, having read everything in it (its row stays, so it keeps its place on My Chats)
  function closeChat(chatId) {
    if (openChatId.value !== chatId) return
    for (let row of summary.value) {
      if (row.chat_id === chatId) row.unread = 0
    }
    openChatId.value = null
  }

  // logged out: nothing to show
  function clear() {
    friendRequests.value = 0
    summary.value = []
  }

  return {
    friendRequests,
    summary,
    openChatId,
    unreadIn,
    lastMessageAt,
    unreadTotal,
    refresh,
    openChat,
    closeChat,
    clear,
  }
})
