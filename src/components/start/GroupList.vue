<script setup>
// Owner: Surya. "Your group" list on 06 Starting points: each member with where they're coming
// from and a status on the right: ✓ added, "Editing" (whoever's location is being chosen), or a
// Remind button (posts a reminder in the group chat). In host mode (the host enters everyone's locations) each row instead has a
// Set / Change button, which emits "select" with that member.
// Usage: <GroupList :hangout="store.hangout" :my-id="myId" :editing-id="editingId"
//          :host-mode="hostMode" @select="startEditing" />
import { computed, ref } from 'vue'
import MemberAvatar from '@/components/voting/MemberAvatar.vue'
import { sendMessage } from '@/services/chat'

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

// The hangout's invite link, used by Remind in the demo (the Invite button is in the step bar)
const inviteLink = computed(
  () => `${window.location.origin}/login?invite=${props.hangout.invite_code}`,
)

// Remind
// Posts a reminder to that person in the hangout's group chat (it shows up live for everyone, and
// for them as soon as they open the hangout). The button says "Sent!" for 2 seconds.
// The demo hangout has no chat, so there it copies the message for you to paste instead.
const remindedId = ref(null) // user_id of the member who was just reminded
const remindLabel = ref('') // "Sent!" or "Copied!"
const remindError = ref('')

// Remind everyone: one message that tags everyone who hasn't added a starting point yet
const remindAllLabel = ref('') // "Sent!" or "Copied!" for 2 seconds

const missing = computed(() => {
  const result = []
  for (const member of props.hangout.members) {
    if (!hasStart(member) && member.user_id !== props.myId) {
      result.push(member)
    }
  }
  return result
})

async function remindEveryone() {
  remindError.value = ''
  const tags = []
  for (const member of missing.value) {
    tags.push(`@${member.display_name}`)
  }
  const text = `${tags.join(' ')}, please add where you're coming from for "${props.hangout.name}" 📍`

  try {
    if (props.hangout.id === 'demo') {
      await navigator.clipboard.writeText(`${text} ${inviteLink.value}`)
      remindAllLabel.value = 'Copied!'
    } else {
      await sendMessage(props.hangout.id, text)
      remindAllLabel.value = 'Sent!'
    }
    setTimeout(() => {
      remindAllLabel.value = ''
    }, 2000)
  } catch (error) {
    console.error(error)
    remindError.value = "Couldn't send the reminder. Try again."
  }
}

async function remind(member) {
  remindError.value = ''
  const text = `@${member.display_name}, please add where you're coming from for "${props.hangout.name}" 📍`

  try {
    if (props.hangout.id === 'demo') {
      await navigator.clipboard.writeText(`${text} ${inviteLink.value}`)
      remindLabel.value = 'Copied!'
    } else {
      await sendMessage(props.hangout.id, text)
      remindLabel.value = 'Sent!'
    }
    remindedId.value = member.user_id
    setTimeout(() => {
      remindedId.value = null
    }, 2000)
  } catch (error) {
    console.error(error)
    remindError.value = `Couldn't remind ${member.display_name}. Try again.`
  }
}
</script>

<template>
  <div>
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
      <h2 class="h6 fw-bold mb-0">Your group</h2>
      <div class="d-flex align-items-center gap-2">
        <span class="small text-secondary"
          >{{ readyCount }} of {{ hangout.members.length }} added</span
        >
        <!-- One reminder for everyone still missing (2 or more; one person has their own Remind) -->
        <button
          v-if="!hostMode && missing.length >= 2"
          type="button"
          class="btn btn-outline-primary btn-sm remind-all"
          @click="remindEveryone"
        >
          {{ remindAllLabel || 'Remind everyone' }}
        </button>
      </div>
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
        <button
          v-else
          type="button"
          class="btn btn-link btn-sm row-action"
          :aria-label="`Remind ${m.display_name} in the group chat`"
          @click="remind(m)"
        >
          {{ remindedId === m.user_id ? remindLabel : 'Remind' }}
        </button>
      </li>
    </ul>
    <p v-if="remindError" class="small text-danger mt-2 mb-0" role="alert">{{ remindError }}</p>
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

.remind-all {
  min-height: 44px; /* big enough to tap with a finger */
  white-space: nowrap;
}

.row-action {
  flex-shrink: 0;
  min-height: 44px; /* big enough to tap with a finger */
  padding: 0 0.6rem;
  color: var(--fp-primary);
  font-weight: 600;
  text-decoration: none;
}
</style>
