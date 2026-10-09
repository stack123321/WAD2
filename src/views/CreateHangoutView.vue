<script setup>
// 05 Create hangout & invite
// Owner: Matrix · Vet by: Hugo
// Figma frame "05". Left: hangout details. Right: invite link, share buttons and who's coming.
// The invite code is made here (not by the database) so the link can be shared before saving.
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import QRCode from 'qrcode'
import { useAuthStore } from '@/stores/auth'
import { createHangout, makeInviteCode } from '@/services/hangouts'

const router = useRouter()
const auth = useAuthStore()

const vibes = [
  { value: 'chill', label: 'Chill' },
  { value: 'food', label: 'Food' },
  { value: 'study', label: 'Study' },
  { value: 'celebrate', label: 'Celebrate' },
  { value: 'active', label: 'Active' },
]

// Hours before the start time; null = voting stays open until the hangout starts.
const deadlines = [
  { hours: 1, label: '1 hour before the hangout' },
  { hours: 2, label: '2 hours before the hangout' },
  { hours: 6, label: '6 hours before the hangout' },
  { hours: 24, label: '1 day before the hangout' },
  { hours: null, label: 'When the hangout starts' },
]

function toDateInput(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const today = toDateInput(new Date())

const form = reactive({
  name: '',
  date: '',
  time: '19:00',
  vibe: [],
  deadlineHours: 2,
  friendsAddStart: true,
})

function toggleVibe(value) {
  const i = form.vibe.indexOf(value)
  if (i === -1) form.vibe.push(value)
  else form.vibe.splice(i, 1)
}

// Invite link
const inviteCode = makeInviteCode()
const inviteUrl = `${window.location.origin}${router.resolve({ name: 'auth', query: { invite: inviteCode } }).href}`
const inviteLabel = inviteUrl.replace(/^https?:\/\//, '')
const shareText = computed(
  () =>
    `Join my hangout${form.name.trim() ? ` "${form.name.trim()}"` : ''} on Fairpoint: ${inviteUrl}`,
)

const copied = ref(false)
let copiedTimer
async function copyLink() {
  try {
    await navigator.clipboard.writeText(inviteUrl)
    copied.value = true
    clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => (copied.value = false), 2000)
  } catch {
    window.prompt('Copy this link:', inviteUrl)
  }
}

const whatsappUrl = computed(() => `https://wa.me/?text=${encodeURIComponent(shareText.value)}`)
const telegramUrl = computed(
  () =>
    `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(
      shareText.value.replace(`: ${inviteUrl}`, ''),
    )}`,
)

const showQr = ref(false)
const qrDataUrl = ref('')
watch(showQr, async (open) => {
  if (open && !qrDataUrl.value) {
    qrDataUrl.value = await QRCode.toDataURL(inviteUrl, { width: 220, margin: 1 })
  }
})

// People list: the host, plus anyone added by name or email (shown as "Invited").
const palette = ['#7056e0', '#f2684a', '#d6528f', '#4a7fe8', '#f2b33d', '#3f9a5b']
const hostName = computed(
  () => auth.user?.user_metadata?.display_name || auth.user?.email?.split('@')[0] || 'You',
)
const invitees = ref([])
const newInvitee = ref('')

function addInvitee() {
  const name = newInvitee.value.trim()
  if (!name) return
  const exists = invitees.value.some((p) => p.name.toLowerCase() === name.toLowerCase())
  if (!exists) invitees.value.push({ name })
  newInvitee.value = ''
}

function removeInvitee(i) {
  invitees.value.splice(i, 1)
}

const people = computed(() => [
  { name: hostName.value, status: 'host' },
  ...invitees.value.map((p) => ({ ...p, status: 'invited' })),
])

function initialOf(name) {
  return name.trim().charAt(0).toUpperCase() || '?'
}

// Submit
const busy = ref(false)
const error = ref('')
const startsAt = computed(() =>
  form.date && form.time ? new Date(`${form.date}T${form.time}`) : null,
)
const canSubmit = computed(() => form.name.trim() && startsAt.value && !busy.value)

async function submit() {
  error.value = ''
  if (startsAt.value <= new Date()) {
    error.value = 'Pick a date and time in the future.'
    return
  }

  const deadline =
    form.deadlineHours === null
      ? startsAt.value
      : new Date(startsAt.value.getTime() - form.deadlineHours * 3600 * 1000)

  busy.value = true
  try {
    const hangout = await createHangout({
      name: form.name.trim(),
      starts_at: startsAt.value.toISOString(),
      vibe: form.vibe,
      vote_deadline: deadline.toISOString(),
      invite_code: inviteCode,
    })
    router.push({
      name: 'starting-points',
      params: { id: hangout.id },
      // TODO(Matrix): save this on the hangout once the schema has a column for it
      query: form.friendsAddStart ? {} : { entry: 'host' },
    })
  } catch (e) {
    error.value = e.message || 'Could not create the hangout. Please try again.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="container create">
    <RouterLink class="back" :to="{ name: 'dashboard' }">&larr; My hangouts</RouterLink>

    <header class="create__header">
      <h1 class="create__title">New hangout</h1>
      <p class="create__sub">Set the basics, then invite your friends.</p>
    </header>

    <form id="create-hangout" class="create__grid" novalidate @submit.prevent="submit">
      <!-- Hangout details -->
      <section class="panel">
        <h2 class="panel__title">Hangout details</h2>

        <div class="field">
          <label for="hangout-name" class="form-label">Hangout name</label>
          <input
            id="hangout-name"
            v-model="form.name"
            class="form-control"
            type="text"
            maxlength="80"
            placeholder="Friday catch-up"
            required
          />
        </div>

        <div class="row g-3 field">
          <div class="col-sm-6">
            <label for="hangout-date" class="form-label">Date</label>
            <input
              id="hangout-date"
              v-model="form.date"
              class="form-control"
              type="date"
              :min="today"
              required
            />
          </div>
          <div class="col-sm-6">
            <label for="hangout-time" class="form-label">Time</label>
            <input
              id="hangout-time"
              v-model="form.time"
              class="form-control"
              type="time"
              step="900"
              required
            />
          </div>
        </div>

        <fieldset class="field">
          <legend class="form-label">What’s the vibe?</legend>
          <div class="chips">
            <button
              v-for="v in vibes"
              :key="v.value"
              type="button"
              class="chip"
              :class="{ 'is-on': form.vibe.includes(v.value) }"
              :aria-pressed="form.vibe.includes(v.value)"
              @click="toggleVibe(v.value)"
            >
              {{ v.label }}
            </button>
          </div>
        </fieldset>

        <div class="field">
          <label for="hangout-deadline" class="form-label">Voting closes</label>
          <select id="hangout-deadline" v-model="form.deadlineHours" class="form-select">
            <option v-for="d in deadlines" :key="d.label" :value="d.hours">{{ d.label }}</option>
          </select>
        </div>

        <div class="switch-row">
          <div>
            <label for="hangout-self-start" class="switch-row__label">
              Friends add their own starting point
            </label>
            <p class="switch-row__hint">Otherwise you’ll enter locations for them</p>
          </div>
          <div class="form-check form-switch mb-0">
            <input
              id="hangout-self-start"
              v-model="form.friendsAddStart"
              class="form-check-input"
              type="checkbox"
              role="switch"
            />
          </div>
        </div>
      </section>

      <!-- Invite friends -->
      <section class="panel">
        <h2 class="panel__title mb-1">Invite friends</h2>
        <p class="panel__sub">Everyone with the link can join and add where they are coming from</p>

        <div class="invite-link">
          <span class="invite-link__url" :title="inviteUrl">{{ inviteLabel }}</span>
          <button type="button" class="btn btn-primary btn-sm" @click="copyLink">
            {{ copied ? 'Copied!' : 'Copy link' }}
          </button>
        </div>
        <p class="invite-note">The link works once you create the hangout.</p>

        <div class="share">
          <a class="share__btn" :href="whatsappUrl" target="_blank" rel="noopener">WhatsApp</a>
          <a class="share__btn" :href="telegramUrl" target="_blank" rel="noopener">Telegram</a>
          <button
            type="button"
            class="share__btn"
            :aria-expanded="showQr"
            @click="showQr = !showQr"
          >
            QR code
          </button>
        </div>

        <div v-if="showQr" class="qr">
          <img
            v-if="qrDataUrl"
            :src="qrDataUrl"
            width="180"
            height="180"
            alt="QR code for the invite link"
          />
          <p class="qr__hint">Friends can scan this to join.</p>
        </div>

        <div class="add-person">
          <span class="add-person__plus" aria-hidden="true">+</span>
          <input
            v-model="newInvitee"
            class="add-person__input"
            type="text"
            placeholder="Add by name or email"
            aria-label="Add a friend by name or email"
            @keydown.enter.prevent="addInvitee"
          />
          <button v-if="newInvitee.trim()" type="button" class="link-btn" @click="addInvitee">
            Add
          </button>
        </div>

        <ul class="people">
          <li v-for="(p, i) in people" :key="p.name" class="person">
            <span class="avatar" :style="{ background: palette[i % palette.length] }">
              {{ initialOf(p.name) }}
            </span>
            <span class="person__name">{{ p.name }}</span>
            <button
              v-if="p.status === 'invited'"
              type="button"
              class="person__remove"
              :aria-label="`Remove ${p.name}`"
              @click="removeInvitee(i - 1)"
            >
              &times;
            </button>
            <span class="badge-status" :class="`badge-status--${p.status}`">
              {{ p.status === 'host' ? 'Host' : 'Invited' }}
            </span>
          </li>
        </ul>
      </section>
    </form>

    <p v-if="error" class="alert alert-danger py-2 small mt-3 mb-0" role="alert">{{ error }}</p>

    <div class="actions">
      <RouterLink class="btn btn-light btn-cancel" :to="{ name: 'dashboard' }">Cancel</RouterLink>
      <button
        type="submit"
        form="create-hangout"
        class="btn btn-primary btn-create"
        :disabled="!canSubmit"
      >
        <span v-if="busy" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
        Create &amp; add starting points &rarr;
      </button>
    </div>
  </main>
</template>

<style scoped>
.create {
  max-width: 1060px;
  padding-block: 2rem 4rem;
}

.back {
  color: var(--fp-primary);
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
}

.back:hover {
  text-decoration: underline;
}

.create__header {
  margin-block: 1.25rem 1.5rem;
}

.create__title {
  margin-bottom: 0.4rem;
  font-size: 1.85rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.create__sub {
  margin: 0;
  color: var(--fp-muted);
}

.create__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
  gap: 1.25rem;
  align-items: start;
}

.panel {
  padding: 1.75rem 1.5rem;
  background: var(--fp-surface);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
}

.panel__title {
  margin-bottom: 1.25rem;
  font-size: 1.1rem;
  font-weight: 700;
}

.panel__sub {
  margin-bottom: 1rem;
  color: var(--fp-muted);
  font-size: 0.85rem;
}

.field {
  margin-bottom: 1.25rem;
}

fieldset.field {
  padding: 0;
  border: 0;
}

.form-label {
  margin-bottom: 0.45rem;
  font-size: 0.9rem;
  font-weight: 600;
}

legend.form-label {
  float: none;
  width: auto;
}

.form-control,
.form-select {
  padding-block: 0.7rem;
  background-color: var(--fp-surface);
  font-size: 0.9rem;
}

.form-control:focus,
.form-select:focus {
  border-color: var(--fp-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--fp-primary) 15%, transparent);
}

/* Vibe chips */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.chip {
  padding: 0.5rem 1.1rem;
  border: 1px solid var(--fp-border);
  border-radius: 999px;
  background: var(--fp-surface);
  color: var(--fp-ink);
  font-size: 0.9rem;
}

.chip:hover {
  border-color: var(--fp-primary);
}

.chip.is-on {
  border-color: var(--fp-primary);
  background: var(--fp-primary);
  color: var(--fp-surface);
}

/* Toggle row */
.switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--fp-border);
}

.switch-row__label {
  font-size: 0.9rem;
  font-weight: 600;
}

.switch-row__hint {
  margin: 0;
  color: var(--fp-muted);
  font-size: 0.8rem;
}

.form-switch .form-check-input {
  width: 2.6em;
  height: 1.4em;
  cursor: pointer;
}

.form-check-input:checked {
  background-color: var(--fp-primary);
  border-color: var(--fp-primary);
}

.form-check-input:focus {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--fp-primary) 15%, transparent);
}

/* Invite link */
.invite-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.5rem 0.5rem 0.9rem;
  border-radius: var(--fp-radius-sm);
  background: var(--fp-bg);
}

.invite-link__url {
  overflow: hidden;
  font-size: 0.9rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.invite-link .btn {
  flex-shrink: 0;
  padding: 0.4rem 0.85rem;
  font-weight: 600;
}

.invite-note {
  margin: 0.4rem 0 0.75rem;
  color: var(--fp-muted);
  font-size: 0.75rem;
}

.share {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.share__btn {
  padding: 0.3rem 0.75rem;
  border: 0;
  border-radius: 999px;
  background: var(--fp-bg);
  color: var(--fp-ink);
  font-size: 0.8rem;
  font-weight: 500;
  text-decoration: none;
}

.share__btn:hover,
.share__btn[aria-expanded='true'] {
  background: var(--fp-border);
}

.qr {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  margin-bottom: 1rem;
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius-sm);
}

.qr__hint {
  margin: 0;
  color: var(--fp-muted);
  font-size: 0.8rem;
}

/* Add person */
.add-person {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.9rem;
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius-sm);
}

.add-person:focus-within {
  border-color: var(--fp-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--fp-primary) 15%, transparent);
}

.add-person__plus {
  color: var(--fp-muted);
}

.add-person__input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 0.9rem;
}

.link-btn {
  padding: 0;
  border: 0;
  background: none;
  color: var(--fp-primary);
  font-size: 0.85rem;
  font-weight: 600;
}

/* People */
.people {
  padding: 0;
  margin: 0.75rem 0 0;
  list-style: none;
}

.person {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-block: 0.55rem;
}

.avatar {
  display: inline-grid;
  flex-shrink: 0;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: var(--fp-surface);
  font-size: 0.75rem;
  font-weight: 700;
}

.person__name {
  flex: 1;
  overflow: hidden;
  font-size: 0.9rem;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.person__remove {
  padding: 0 0.25rem;
  border: 0;
  background: none;
  color: var(--fp-muted);
  font-size: 1.1rem;
  line-height: 1;
}

.person__remove:hover {
  color: var(--fp-accent);
}

.badge-status {
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
}

.badge-status--host {
  background: color-mix(in srgb, #7056e0 12%, transparent);
  color: #7056e0;
}

.badge-status--invited {
  background: color-mix(in srgb, #f2b33d 22%, transparent);
  color: #a86f00;
}

/* Footer actions */
.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.btn-cancel,
.btn-create {
  padding: 0.7rem 1.25rem;
  font-weight: 600;
}

.btn-cancel {
  border-color: var(--fp-border);
  background: var(--fp-surface);
}

@media (max-width: 767.98px) {
  .create__grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .actions {
    flex-direction: column-reverse;
  }

  .actions .btn {
    width: 100%;
  }
}
</style>
