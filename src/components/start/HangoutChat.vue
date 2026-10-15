<script setup>
// Owner: Surya. Group chat for a hangout, on 06 Starting points. Everyone in the hangout can read
// and post; new messages appear live for everyone (Supabase Realtime).
// Usage: <HangoutChat :hangout="store.hangout" :my-id="myId" />
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { getMessages, sendMessage, subscribeToMessages } from '@/services/chat'
import MemberAvatar from '@/components/voting/MemberAvatar.vue'

const props = defineProps({
  hangout: { type: Object, required: true }, // needs id, members
  myId: { type: String, required: true },
})

const messages = ref([])
const draft = ref('')
const loading = ref(true)
const sending = ref(false)
const error = ref('')
const listEl = ref(null) // the scrolling message list
const isDemo = props.hangout.id === 'demo'

// Part (a) Load the messages, then listen for new ones
let stopListening = () => {}

onMounted(async () => {
  try {
    messages.value = await getMessages(props.hangout.id)
  } catch (err) {
    console.error(err)
    error.value = "Couldn't load the chat."
  }
  loading.value = false
  scrollToBottom()
  stopListening = subscribeToMessages(props.hangout.id, addMessage)
})

onUnmounted(() => stopListening())

// A message arrived (live, or our own after sending). Skip it if we already have it.
function addMessage(message) {
  const alreadyShown = messages.value.find((m) => m.id === message.id)
  if (alreadyShown) {
    return
  }
  messages.value.push(message)
  scrollToBottom()
}

// Keep the newest message in view
async function scrollToBottom() {
  await nextTick()
  if (listEl.value) {
    listEl.value.scrollTop = listEl.value.scrollHeight
  }
}

// Part (b) Sending
async function send() {
  error.value = ''
  if (draft.value.trim() === '') {
    return
  }
  sending.value = true
  try {
    const saved = await sendMessage(props.hangout.id, draft.value)
    addMessage(saved)
    draft.value = ''
  } catch (err) {
    console.error(err)
    error.value = err.message || "Couldn't send. Try again."
  }
  sending.value = false
}

// Part (c) Helpers for showing a message
function sender(message) {
  const member = props.hangout.members.find((m) => m.user_id === message.user_id)
  if (member) {
    return member
  }
  return { display_name: 'Someone', avatar_color: null } // e.g. someone who has left
}

function isMine(message) {
  return message.user_id === props.myId
}

// A message aimed at you, e.g. a reminder "@Surya, please add where you're coming from…"
function isForMe(message) {
  const me = props.hangout.members.find((m) => m.user_id === props.myId)
  if (!me || isMine(message)) {
    return false
  }
  return message.body.startsWith(`@${me.display_name}`)
}

// "7:05 PM"
function timeLabel(message) {
  return new Date(message.created_at).toLocaleTimeString('en-SG', {
    hour: 'numeric',
    minute: '2-digit',
  })
}
</script>

<template>
  <section class="chat">
    <div class="d-flex justify-content-between align-items-baseline mb-2">
      <h2 class="h6 fw-bold mb-0">Group chat</h2>
      <span class="small text-secondary">Everyone in this hangout</span>
    </div>

    <p v-if="isDemo" class="small text-secondary mb-0">
      Chat works in real hangouts. Create one from My hangouts to try it.
    </p>

    <template v-else>
      <div ref="listEl" class="messages" role="log" aria-live="polite" aria-label="Chat messages">
        <p v-if="loading" class="small text-secondary mb-0">Loading…</p>
        <p v-else-if="messages.length === 0" class="small text-secondary mb-0">
          No messages yet. Say hi and agree on the plan!
        </p>
        <div
          v-for="m in messages"
          :key="m.id"
          class="message"
          :class="{ 'message--mine': isMine(m), 'message--for-me': isForMe(m) }"
        >
          <MemberAvatar
            v-if="!isMine(m)"
            :name="sender(m).display_name"
            :color="sender(m).avatar_color"
            :size="28"
          />
          <div class="bubble">
            <div v-if="!isMine(m)" class="bubble-name">{{ sender(m).display_name }}</div>
            <div class="bubble-text">{{ m.body }}</div>
            <div class="bubble-time">{{ timeLabel(m) }}</div>
          </div>
        </div>
      </div>

      <form class="send-row" @submit.prevent="send">
        <label for="chat-input" class="visually-hidden">Message</label>
        <input
          id="chat-input"
          v-model="draft"
          class="form-control"
          type="text"
          maxlength="500"
          placeholder="Message your group"
          autocomplete="off"
        />
        <button
          type="submit"
          class="btn btn-primary send-btn"
          :disabled="sending || draft.trim() === ''"
        >
          {{ sending ? 'Sending…' : 'Send' }}
        </button>
      </form>
      <p v-if="error" class="small text-danger mt-2 mb-0" role="alert">{{ error }}</p>
    </template>
  </section>
</template>

<style scoped>
.chat {
  padding: 1rem;
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius-sm);
  background: var(--fp-bg);
}

.messages {
  height: 260px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.25rem 0;
  margin-bottom: 0.75rem;
}

.message {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  max-width: 85%;
}

/* Your own messages sit on the right, in the brand colour */
.message--mine {
  align-self: flex-end;
}

.bubble {
  background: var(--fp-surface);
  border: 1px solid var(--fp-border);
  border-radius: 14px 14px 14px 4px;
  padding: 0.45rem 0.75rem;
  min-width: 0;
}

.message--mine .bubble {
  background: var(--fp-primary);
  border-color: var(--fp-primary);
  color: var(--fp-surface);
  border-radius: 14px 14px 4px 14px;
}

.message--for-me .bubble {
  background: color-mix(in srgb, var(--fp-accent) 16%, var(--fp-surface));
  border-color: var(--fp-accent);
}

.bubble-name {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--fp-muted);
}

.bubble-text {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.bubble-time {
  font-size: 0.7rem;
  opacity: 0.7;
  text-align: right;
}

.send-row {
  display: flex;
  gap: 0.5rem;
}

.send-btn {
  flex-shrink: 0;
  min-height: 44px; /* big enough to tap with a finger */
}
</style>
