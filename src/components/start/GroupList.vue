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

// The hangout's invite link (same as on 05 Create hangout). Opening it asks friends to log in,
// then adds them to this hangout.
const inviteLink = computed(
  () => `${window.location.origin}/login?invite=${props.hangout.invite_code}`,
)

// Invite friends: copy the link, or share it straight to WhatsApp / Telegram
const inviteText = computed(
  () => `Join my hangout "${props.hangout.name}" on Fairpoint and add where you're coming from:`,
)
const whatsappUrl = computed(
  () => `https://wa.me/?text=${encodeURIComponent(inviteText.value + ' ' + inviteLink.value)}`,
)
const telegramUrl = computed(
  () =>
    `https://t.me/share/url?url=${encodeURIComponent(inviteLink.value)}&text=${encodeURIComponent(inviteText.value)}`,
)
const linkCopied = ref(false)

async function copyInvite() {
  try {
    await navigator.clipboard.writeText(inviteLink.value)
    linkCopied.value = true
    setTimeout(() => {
      linkCopied.value = false
    }, 2000)
  } catch (error) {
    console.error(error)
    window.prompt('Copy this invite link:', inviteLink.value)
  }
}

// Remind
// Posts a reminder to that person in the hangout's group chat (it shows up live for everyone, and
// for them as soon as they open the hangout). The button says "Sent!" for 2 seconds.
// The demo hangout has no chat, so there it copies the message for you to paste instead.
const remindedId = ref(null) // user_id of the member who was just reminded
const remindLabel = ref('') // "Sent!" or "Copied!"
const remindError = ref('')

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

    <!-- Invite friends -->
    <div class="invite mt-3">
      <div class="fw-semibold">Invite friends</div>
      <p class="small text-secondary mb-2">
        Send this link. Friends log in, join, and add where they're coming from.
      </p>
      <div class="invite-row">
        <span class="invite-link small text-truncate" :title="inviteLink">{{ inviteLink }}</span>
        <button type="button" class="btn btn-primary btn-sm copy-btn" @click="copyInvite">
          <span v-if="linkCopied">Copied!</span>
          <span v-else>Copy link</span>
        </button>
      </div>
      <div class="d-flex gap-2 mt-2">
        <a
          :href="whatsappUrl"
          target="_blank"
          rel="noopener"
          class="btn btn-outline-primary btn-sm share-btn"
        >
          WhatsApp
        </a>
        <a
          :href="telegramUrl"
          target="_blank"
          rel="noopener"
          class="btn btn-outline-primary btn-sm share-btn"
        >
          Telegram
        </a>
      </div>
    </div>
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
  min-height: 44px; /* big enough to tap with a finger */
  padding: 0 0.6rem;
  color: var(--fp-primary);
  font-weight: 600;
  text-decoration: none;
}
.invite {
  padding: 1rem;
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius-sm);
  background: var(--fp-bg);
}

.invite-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.invite-link {
  flex-grow: 1;
  min-width: 0;
  padding: 0.5rem 0.75rem;
  border-radius: var(--fp-radius-sm);
  background: var(--fp-surface);
}

.copy-btn,
.share-btn {
  flex-shrink: 0;
  min-height: 44px; /* big enough to tap with a finger */
  display: inline-flex;
  align-items: center;
}
</style>
