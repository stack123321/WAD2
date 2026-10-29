<script setup>
// Owner: Surya. The group chat's newest message on 06 Starting points, e.g.
// "💬 Nicole: I'm leaving from Tampines · Reply", so people see the chat without opening it.
// Hidden when the chat has no messages yet (and in the demo hangout, which has no chat).
// New messages show up live: Ryan's alerts store already hears about every new message (for the
// red badges), so when this chat's newest time changes we load it again. (A second live listener on
// the same chat would clash with the chat panel's.) "Reply" emits open-chat, and the page opens
// the chat panel.
// Usage: <LatestMessage :hangout="store.hangout" :my-id="myId" @open-chat="openChat" />
import { onMounted, ref, watch } from 'vue'
import { getMessages } from '@/services/chat'
import { useAlertsStore } from '@/stores/alerts'

const props = defineProps({
  hangout: { type: Object, required: true }, // needs id, members
  myId: { type: String, default: '' },
})

const emit = defineEmits(['open-chat'])

const alerts = useAlertsStore()
const latest = ref(null) // the newest message, or null

// Part (a) Load the newest message, then keep it up to date
async function loadLatest() {
  try {
    const messages = await getMessages(props.hangout.id)
    if (messages.length > 0) {
      latest.value = messages[messages.length - 1] // oldest first, so the last one is the newest
    }
  } catch (err) {
    console.error(err) // only extra: the page works without it
  }
}

onMounted(loadLatest)
watch(() => alerts.lastMessageAt(props.hangout.id), loadLatest) // someone posted

// Part (b) Who sent it: "You", their name, or "Someone" (e.g. they left the hangout)
function senderName(message) {
  if (message.user_id === props.myId) {
    return 'You'
  }
  const member = props.hangout.members.find((m) => m.user_id === message.user_id)
  if (!member) {
    return 'Someone'
  }
  return member.display_name
}
</script>

<template>
  <button v-if="latest" type="button" class="latest" @click="emit('open-chat')">
    <span aria-hidden="true">💬</span>
    <span class="latest__text">
      <strong>{{ senderName(latest) }}:</strong> {{ latest.body }}
    </span>
    <span class="latest__reply">Reply</span>
  </button>
</template>

<style scoped>
/* one line under the heading: the message is cut with … so it never pushes the page wider */
.latest {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  min-height: 44px;
  margin-bottom: 1rem;
  padding: 0.5rem 0.85rem;
  border: 1px solid color-mix(in srgb, var(--fp-accent) 45%, var(--fp-border));
  border-radius: var(--fp-radius-sm);
  background: color-mix(in srgb, var(--fp-accent) 8%, var(--fp-surface));
  color: var(--fp-ink);
  font-size: 0.875rem;
  text-align: left;
}

.latest:hover {
  border-color: var(--fp-accent);
}

.latest__text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.latest__reply {
  flex-shrink: 0;
  font-weight: 700;
}
</style>
