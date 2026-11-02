<script setup>
// Owner: Ryan
// one "are you sure?" pop-up for the whole app, so every confirm looks the same (started as the re-vote pop-up on 12)
// Usage: <ConfirmDialog :open="asking" title="Delete it?" text="This can't be undone." button="Delete" danger @confirm="doIt" @cancel="asking = false" />
// the page decides when it shows (open) and closes it again in its own confirm and cancel handlers
import { nextTick, ref, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false }, // shows the pop-up while true
  title: { type: String, required: true }, // the question, e.g. 'Delete "Sunday chill"?'
  text: { type: String, required: true }, // what will happen, under the question
  button: { type: String, required: true }, // the words on the action button
  danger: { type: Boolean, default: false }, // red action button, for things that remove something
})
const emit = defineEmits(['confirm', 'cancel'])

const cancelBtn = ref(null)

// when it opens, the keyboard starts on Cancel, so Esc works straight away and Enter can't remove something by accident
watch(
  () => props.open,
  async (open) => {
    if (!open) return
    await nextTick() // wait for the v-if to put the pop-up on the page
    cancelBtn.value.focus()
  },
)
</script>

<template>
  <!-- clicking the dark area around the box, or pressing Esc, is the same as Cancel -->
  <div
    v-if="open"
    class="confirm-backdrop"
    role="presentation"
    @click.self="emit('cancel')"
    @keydown.esc="emit('cancel')"
  >
    <section
      class="confirm-box"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      tabindex="-1"
    >
      <h2 id="confirm-title" class="h5 mb-2">{{ title }}</h2>
      <p class="mb-4">{{ text }}</p>
      <div class="confirm-actions">
        <button
          ref="cancelBtn"
          type="button"
          class="btn btn-outline-secondary"
          @click="emit('cancel')"
        >
          Cancel
        </button>
        <button
          type="button"
          class="btn"
          :class="danger ? 'btn-danger' : 'btn-primary'"
          @click="emit('confirm')"
        >
          {{ button }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* the dark layer over the whole page, above the tab bar (1030) */
.confirm-backdrop {
  position: fixed;
  z-index: 1050;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgb(0 0 0 / 45%);
}

.confirm-box {
  width: min(100%, 28rem);
  padding: 1.5rem;
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
  background: var(--fp-surface);
  box-shadow: var(--fp-shadow);
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

/* 44px tall so the buttons are easy to tap */
.confirm-actions .btn {
  min-width: 6rem;
  min-height: 44px;
}
</style>
