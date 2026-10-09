<script setup>
// Owner: Surya. "Your group" list on 06 Starting points: each member with where they're coming
// from and a status on the right: ✓ added, "Editing" (you, while searching), or a Remind button.
// Usage: <GroupList :hangout="store.hangout" :my-id="myId" :editing="editing" />
import { computed, ref } from 'vue'
import MemberAvatar from '@/components/voting/MemberAvatar.vue'

const props = defineProps({
  hangout: { type: Object, required: true }, // needs name, invite_code, members
  myId: { type: String, required: true },
  editing: { type: Boolean, default: false }, // is the logged-in user choosing a start right now?
})

const hasStart = (m) => m.start_lat != null && m.start_lng != null
const readyCount = computed(() => props.hangout.members.filter(hasStart).length)

// ── Remind ──
// There's no notifications backend, so "Remind" copies a message with the invite link for you to
// paste into the group chat.
const copiedFor = ref(null) // user_id whose reminder was just copied

async function remind(member) {
  const link = `${window.location.origin}/login?invite=${props.hangout.invite_code}`
  const text = `Hey ${member.display_name}, add where you're coming from for "${props.hangout.name}": ${link}`
  try {
    await navigator.clipboard.writeText(text)
    copiedFor.value = member.user_id
    setTimeout(() => {
      if (copiedFor.value === member.user_id) copiedFor.value = null
    }, 2000)
  } catch (err) {
    console.error(err)
    window.prompt('Copy this reminder:', text)
  }
}
</script>

<template>
  <div>
    <div class="d-flex justify-content-between align-items-baseline mb-2">
      <h2 class="h6 fw-bold mb-0">Your group</h2>
      <span class="small text-secondary"
        >{{ readyCount }} of {{ hangout.members.length }} added</span
      >
    </div>

    <ul class="list-unstyled mb-0">
      <li
        v-for="m in hangout.members"
        :key="m.user_id"
        class="member"
        :class="{ editing: m.user_id === myId && editing }"
      >
        <MemberAvatar :name="m.display_name" :color="m.avatar_color" :size="40" />
        <div class="min-w-0 flex-grow-1">
          <div class="fw-semibold">
            {{ m.display_name }}<span v-if="m.user_id === myId"> (you)</span>
          </div>
          <div v-if="m.user_id === myId && editing" class="small text-secondary">Choosing…</div>
          <div v-else-if="hasStart(m)" class="small text-secondary text-truncate">
            {{ m.start_label }}
          </div>
          <div v-else class="small text-secondary">Waiting for {{ m.display_name }}…</div>
        </div>

        <span v-if="m.user_id === myId && editing" class="editing-tag">Editing</span>
        <span v-else-if="hasStart(m)" class="check" aria-label="Added">✓</span>
        <button v-else type="button" class="btn btn-link btn-sm remind" @click="remind(m)">
          {{ copiedFor === m.user_id ? 'Copied!' : 'Remind' }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.min-w-0 {
  min-width: 0; /* lets text-truncate work inside a flex row */
}

.member {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.65rem 0.75rem;
  margin: 0 -0.75rem;
  border-radius: var(--fp-radius-sm);
}

.member.editing {
  background: color-mix(in srgb, var(--fp-accent) 14%, var(--fp-surface));
}

.editing-tag {
  flex-shrink: 0;
  background: var(--fp-surface);
  color: var(--fp-accent);
  border-radius: 999px;
  padding: 0.2rem 0.7rem;
  font-size: 0.8rem;
  font-weight: 500;
}

.check {
  flex-shrink: 0;
  color: var(--fp-primary);
  font-size: 1.1rem;
}

.remind {
  flex-shrink: 0;
  color: var(--fp-primary);
  font-weight: 600;
  text-decoration: none;
}
</style>
