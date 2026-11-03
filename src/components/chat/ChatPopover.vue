<script setup>
// Owner: Ryan
// the hangout's group chat on top of whichever step you're on, opened by 💬 in the step bar:
// the whole screen on phones, a panel just below the step bar on bigger screens. It stays open
// while you use the page, and ✕ or Esc closes it.
// Usage (App.vue): <ChatPopover :hangout="store.hangout" @close="store.chatOpen = false" />
import { onMounted, ref } from 'vue'
import HangoutChat from '@/components/chat/HangoutChat.vue'

defineProps({
  hangout: { type: Object, required: true }, // needs id, members
})
const emit = defineEmits(['close'])

const closeBtn = ref(null)

// the keyboard starts on ✕, so Esc works straight away
onMounted(() => closeBtn.value.focus())
</script>

<template>
  <section
    id="chat-pop"
    class="chat-pop"
    role="dialog"
    aria-label="Group chat"
    @keydown.esc="emit('close')"
  >
    <!-- the message list's height comes from --chat-list-height below, so it can differ by screen size,
         and ✕ goes at the end of the chat's title line -->
    <HangoutChat :hangout="hangout" height="var(--chat-list-height)">
      <template #actions>
        <button
          ref="closeBtn"
          type="button"
          class="btn-close chat-pop__close"
          aria-label="Close chat"
          @click="emit('close')"
        ></button>
      </template>
    </HangoutChat>
  </section>
</template>

<style scoped>
/* phones: the whole screen, over the tab bar (1030) */
.chat-pop {
  --chat-list-height: calc(100dvh - 9rem); /* what the title line and the message box leave */
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1050;
  overflow-y: auto; /* if a short screen can't fit it all, it scrolls instead of hiding the message box */
  padding: 0.5rem 1rem 1rem;
  background: var(--fp-surface);
}

/* the chat's own box isn't needed inside the panel */
.chat-pop :deep(.chat) {
  padding: 0;
  border: 0;
  background: none;
}

/* bigger screens: a panel just below the step bar, at its right edge under 💬, on top of the page */
@media (min-width: 768px) {
  .chat-pop {
    --chat-list-height: 360px;
    top: calc(var(--fp-sticky-top, 9rem) + 0.5rem);
    right: 1rem; /* the step bar's padding (px-3) */
    bottom: auto;
    left: auto;
    width: 380px;
    border: 1px solid var(--fp-border);
    border-radius: var(--fp-radius);
    box-shadow: var(--fp-shadow-lift);
  }
}

@media (min-width: 992px) {
  .chat-pop {
    right: 3rem; /* the step bar's wider padding from here (px-lg-5) */
  }
}

.chat-pop__close {
  width: 44px;
  height: 44px;
  padding: 0;
}
</style>
