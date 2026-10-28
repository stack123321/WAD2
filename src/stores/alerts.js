// Owner: Ryan
// the red badges in the navbar: friend requests waiting for me, and unread chat messages.
// also when each chat's newest message was sent, so My Chats can put the newest first
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getFriendships } from '@/services/friends'
import { getChatSummary } from '@/services/unread'

// a store is shared by every page, so the navbar badge and my chats always show the same numbers.
export const useAlertsStore = defineStore('alerts', () => {
  const friendRequests = ref(0) // how many people asked to be my friend
  const summary = ref([]) // [{ chat_id, unread, last_at }], one per chat with messages
  const openChatId = ref(null) // the chat on screen right now, never counted as unread

  // unread messages in one chat (My Chats shows it on each row)
  function unreadIn(chatId) {
    if (chatId === openChatId.value) return 0 // i'm reading it right now
    const row = summary.value.find((r) => r.chat_id === chatId)
    return row ? row.unread : 0 // no row means no messages yet
  }

  // when the newest message in a chat was sent, 0 if it has none (My Chats sorts by this)
  function lastMessageAt(chatId) {
    const row = summary.value.find((r) => r.chat_id === chatId)
    return row ? new Date(row.last_at).getTime() : 0 // as a number, so two chats can be compared when sorting
  }

  // unread messages across all my chats, for the badge on Chats
  const unreadTotal = computed(() => {
    let total = 0
    for (let row of summary.value) {
      if (row.chat_id !== openChatId.value) total += row.unread // skip the chat i'm reading
    }
    return total
  })

  // ask the database again (after a page change, a new message, or reading a chat)
  // a page change and a new message can both call refresh at once, and the older call might answer last and overwrite newer numbers.
  // each call takes a ticket, and only the newest ticket may update the badges.
  let latest = 0 // newest ticket handed out

  async function refresh(myId) {
    // each call takes the next ticket: 1st call gets 1, a 2nd call a moment later gets 2
    latest = latest + 1
    const mine = latest // my ticket, latest may go up while i wait below
    try {
      const lists = await getFriendships(myId) // my friendships, to count requests waiting for me
      const chats = await getChatSummary() // each chat's unread count and newest message time
      // a newer call started while i waited, so my answer is old: let that one update instead
      if (mine !== latest) return
      friendRequests.value = lists.requests.length // red badge on friends
      summary.value = chats // red badge on chats, and the counts on my chats
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
    if (openChatId.value !== chatId) return // a different chat is open now, leave it alone
    for (let row of summary.value) {
      if (row.chat_id === chatId) row.unread = 0 // everything in it is read
    }
    openChatId.value = null // no chat on screen
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
