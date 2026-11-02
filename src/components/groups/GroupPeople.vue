<script setup>
// Owner: Eashvar. Everyone in a friend group with their usual starting point (/groups/:id).
// You set or change your own; the owner can take people out. The page saves the changes.
// Usage: <GroupPeople :group="group" :trips="trips" :my-id="myId" :is-owner="isOwner"
//          :saving="saving" @save-start="saveStart" @remove="removeMember" />
//   trips → from usualTrips() in services/groups.js (a usual start, or the last one they used)
//   save-start → { place: { label, lat, lng }, mode }; remove → the member
import { computed, ref } from 'vue'
import MemberAvatar from '@/components/voting/MemberAvatar.vue'
import PlaceSearch from '@/components/map/PlaceSearch.vue'

const props = defineProps({
  group: { type: Object, required: true },
  trips: { type: Object, required: true },
  myId: { type: String, default: null },
  isOwner: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['save-start', 'remove'])

const MODES = [
  { value: 'mrt', label: 'MRT' },
  { value: 'bus', label: 'Bus' },
  { value: 'car', label: 'Car' },
  { value: 'walk', label: 'Walk' },
]

function modeLabel(mode) {
  const found = MODES.find((m) => m.value === mode)
  return found ? found.label : ''
}

// me first, then everyone else in the order they joined
const people = computed(() => {
  const me = props.group.members.filter((m) => m.user_id === props.myId)
  const others = props.group.members.filter((m) => m.user_id !== props.myId)
  return [...me, ...others]
})

// "Tampines MRT · MRT", or where they started last time
function startLine(member) {
  const trip = props.trips[member.user_id]
  if (!trip) {
    return member.user_id === props.myId ? 'Not set yet' : 'Not set yet. They’ll add it on 06.'
  }
  const mode = modeLabel(trip.mode)
  return mode ? `${trip.label} · ${mode}` : trip.label
}

// Part (a) Setting my usual start
const editing = ref(false)
const place = ref(null) // the place picked in the search
const mode = ref(null)

function startEditing() {
  const mine = props.trips[props.myId]
  place.value = mine ? { label: mine.label, lat: mine.lat, lng: mine.lng } : null
  mode.value = mine ? mine.mode : null
  editing.value = true
}

function onChoose(picked) {
  place.value = { label: picked.label, lat: picked.lat, lng: picked.lng }
}

function save() {
  emit('save-start', { place: place.value, mode: mode.value })
  editing.value = false
}

// Part (b) Taking someone out (owner only), asked once before it happens
const confirmingId = ref(null)

function remove(member) {
  confirmingId.value = null
  emit('remove', member)
}
</script>

<template>
  <ul class="people">
    <li v-for="m in people" :key="m.user_id" class="person">
      <div class="person__row">
        <MemberAvatar :name="m.display_name" :color="m.avatar_color" :size="36" />
        <div class="person__info">
          <p class="person__name">
            {{ m.user_id === myId ? 'You' : m.display_name }}
            <span v-if="m.user_id === group.owner_id" class="tag">Owner</span>
          </p>
          <p class="person__start" :class="{ 'is-empty': !trips[m.user_id] }">
            <span aria-hidden="true">📍</span> {{ startLine(m) }}
            <span v-if="trips[m.user_id]?.fromLast" class="from-last">from the last hangout</span>
          </p>
        </div>

        <button
          v-if="m.user_id === myId && !editing"
          type="button"
          class="btn btn-outline-primary btn-tap"
          @click="startEditing"
        >
          {{ trips[m.user_id] && !trips[m.user_id].fromLast ? 'Change' : 'Set' }}
          <span class="visually-hidden">your usual starting point</span>
        </button>
        <button
          v-else-if="isOwner && m.user_id !== myId && confirmingId !== m.user_id"
          type="button"
          class="btn btn-link text-secondary btn-tap"
          @click="confirmingId = m.user_id"
        >
          Remove <span class="visually-hidden">{{ m.display_name }}</span>
        </button>
      </div>

      <!-- the owner taking someone out: one more tap to be sure -->
      <div v-if="confirmingId === m.user_id" class="confirm" role="group">
        <span class="small">Take {{ m.display_name }} out of the group?</span>
        <button type="button" class="btn btn-outline-danger btn-tap" @click="remove(m)">
          Remove
        </button>
        <button type="button" class="btn btn-link btn-tap" @click="confirmingId = null">
          Cancel
        </button>
      </div>

      <!-- my usual start: search a place and, if I like, how I usually travel -->
      <div v-if="m.user_id === myId && editing" class="editor">
        <p class="small mb-2">
          Where do you usually come from when you meet this group?
          <template v-if="place">
            Now: <strong>{{ place.label }}</strong>
          </template>
        </p>
        <PlaceSearch
          placeholder="e.g. Tampines MRT or a postal code"
          :show-location="true"
          @choose="onChoose"
        />

        <p class="small fw-semibold mt-3 mb-2">How do you usually get there?</p>
        <div class="chips" role="group" aria-label="How you usually travel">
          <button
            v-for="opt in MODES"
            :key="opt.value"
            type="button"
            class="chip"
            :class="{ 'is-on': mode === opt.value }"
            :aria-pressed="mode === opt.value"
            @click="mode = mode === opt.value ? null : opt.value"
          >
            {{ opt.label }}
          </button>
        </div>

        <div class="editor__actions">
          <button type="button" class="btn btn-link btn-tap" @click="editing = false">
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-primary btn-tap"
            :disabled="!place || saving"
            @click="save"
          >
            {{ saving ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.people {
  list-style: none;
  margin: 0;
  padding: 0;
}

.person {
  padding: 0.75rem 0;
}

.person + .person {
  border-top: 1px solid var(--fp-border);
}

.person__row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.person__info {
  flex: 1;
  min-width: 0;
}

.person__name {
  margin: 0;
  font-weight: 700;
}

.tag {
  margin-left: 0.35rem;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: var(--fp-bg);
  border: 1px solid var(--fp-border);
  color: var(--fp-muted);
  font-size: 0.75rem;
  font-weight: 600;
}

.person__start {
  margin: 0.1rem 0 0;
  font-size: 0.875rem;
  color: var(--fp-ink);
}

.person__start.is-empty {
  color: var(--fp-muted);
}

.from-last {
  display: inline-block;
  margin-left: 0.25rem;
  color: var(--fp-muted);
  font-style: italic;
}

.btn-tap {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
}

.confirm {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding-left: calc(36px + 0.75rem);
}

.editor {
  margin-top: 0.75rem;
  padding: 1rem;
  border-radius: var(--fp-radius-sm);
  background: var(--fp-bg);
  border: 1px solid var(--fp-border);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.chip {
  min-height: 44px;
  min-width: 64px;
  padding: 0 1rem;
  border-radius: 999px;
  border: 1px solid var(--fp-border);
  background: var(--fp-surface);
  color: var(--fp-ink);
  font-weight: 600;
}

.chip.is-on {
  border-color: var(--fp-primary);
  background: var(--fp-primary);
  color: var(--fp-surface);
}

.editor__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}
</style>
