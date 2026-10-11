<script setup>
// Owner: Surya. "Your group" list on 06 Starting points: each member with where they're coming
// from and a status on the right: ✓ added, "Editing" (whoever's location is being chosen), or a
// Remind button. In host mode (the host enters everyone's locations) each row instead has a
// Set / Change button, which emits "select" with that member.
// Usage: <GroupList :hangout="store.hangout" :my-id="myId" :editing-id="editingId"
//          :host-mode="hostMode" @select="startEditing" />
import { computed, ref } from 'vue'
import MemberAvatar from '@/components/voting/MemberAvatar.vue'

const props = defineProps({
  hangout: { type: Object, required: true }, // needs name, invite_code, members
  myId: { type: String, required: true },
  editingId: { type: String, default: null }, // the member whose location is being chosen now
  hostMode: { type: Boolean, default: false },
})

const emit = defineEmits(['select'])

function hasStart(member) {
  return member.start_lat != null && member.start_lng != null
}

// "5 of 6 added"
const readyCount = computed(() => {
  let count = 0
  for (const member of props.hangout.members) {
    if (hasStart(member)) {
      count++
    }
  }
  return count
})

// Remind
// There's no notifications backend, so "Remind" copies a message with the invite link for you to
// paste into the group chat. The button says "Copied!" for 2 seconds.
const copiedFor = ref(null) // user_id of the member whose reminder was just copied

async function remind(member) {
  const link = `${window.location.origin}/login?invite=${props.hangout.invite_code}`
  const text = `Hey ${member.display_name}, add where you're coming from for "${props.hangout.name}": ${link}`

  try {
    await navigator.clipboard.writeText(text)
    copiedFor.value = member.user_id
    setTimeout(() => {
      copiedFor.value = null
    }, 2000)
  } catch (error) {
    // some browsers block copying: show the message so it can be copied by hand
    console.error(error)
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
        :class="{ editing: m.user_id === editingId }"
      >
        <MemberAvatar :name="m.display_name" :color="m.avatar_color" :size="40" />
        <div class="min-w-0 flex-grow-1">
          <div class="fw-semibold">
            {{ m.display_name }}<span v-if="m.user_id === myId"> (you)</span>
          </div>
          <div v-if="m.user_id === editingId" class="small text-secondary">Choosing…</div>
          <div v-else-if="hasStart(m)" class="small text-secondary text-truncate">
            {{ m.start_label }}
          </div>
          <div v-else-if="hostMode" class="small text-secondary">Not set yet</div>
          <div v-else class="small text-secondary">Waiting for {{ m.display_name }}…</div>
        </div>

        <span v-if="m.user_id === editingId" class="editing-tag">Editing</span>
        <button
          v-else-if="hostMode"
          type="button"
          class="btn btn-link btn-sm row-action"
          :aria-label="`${hasStart(m) ? 'Change' : 'Set'} ${m.display_name}'s starting point`"
          @click="emit('select', m)"
        >
          {{ hasStart(m) ? 'Change' : 'Set' }}
        </button>
        <span v-else-if="hasStart(m)" class="check" aria-label="Added">✓</span>
        <button v-else type="button" class="btn btn-link btn-sm row-action" @click="remind(m)">
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

.row-action {
  flex-shrink: 0;
  color: var(--fp-primary);
  font-weight: 600;
  text-decoration: none;
}
</style>
