<script setup>
// Owner: Eashvar. "Ask for something specific" on 09 Nearby spots: the user types what they
// want ("prata for dinner, one of us is halal") and the spot cards below switch to real places
// that fit, found by /api/assistant (Gemini reads the request, Google Places finds the spots).
// Follow-up buttons ("Cheaper", "Closer to the MRT") refine the last search, and when only a
// few spots turn up it offers 08 Midpoint, where the group can preview other stations.
// The group's dietary needs from 03 (e.g. someone eats halal) show as buttons that start off:
// tap one to narrow the next search, and its label is added to (or removed from) the text box.
// Typing "halal" in the message works too.
// Each question uses one Google Places search, so it follows the same on/off switch as the page.
// Usage: <AskSpots :hangout="store.hangout" :members="store.members" @found="askedSpots = $event" />
//   found → camel-cased spots (as from loadSpots()) to show instead of the usual list, or null
//   when the user goes back to all spots
import { computed, reactive, ref, toRefs, watch } from 'vue'
import { askAssistant } from '@/services/assistant'
import { cacheSpots, googlePlacesEnabled } from '@/services/places'
import { isMockHangout } from '@/services/votes'
import { groupNeeds } from './groupNeeds'

const props = defineProps({
  hangout: { type: Object, required: true },
  members: { type: Array, default: () => [] },
  // Optional reactive { message, history, result, lastTurn, dietOn } kept by the parent, so the
  // last question and answer survive leaving the page
  memory: { type: Object, default: null },
})
const emit = defineEmits(['found'])

const MAX_LENGTH = 300
const FOLLOW_UPS = ['Cheaper', 'Closer to the MRT', 'Something else']
const BUDGET_TEXT = { 1: 'under $15 each', 2: '$15–30 each', 3: '$30+ each' }

// message; history [{ role: 'user' | 'model', text }] for follow-ups; result { reply, query,
// suggestOtherStations }; lastTurn { text, history } to redo it; dietOn e.g. ['halal']
const { message, history, result, lastTurn, dietOn } = toRefs(
  props.memory ?? reactive({ message: '', history: [], result: null, lastTurn: null, dietOn: [] }),
)
const loading = ref(false)
const error = ref('')

const groupHas = computed(() => groupNeeds(props.members))
// What's sent: everyone's size and budget, but only the dietary needs that are switched on
const needs = computed(() => ({
  ...groupHas.value,
  dietary: groupHas.value.dietary.filter((d) => dietOn.value.includes(d)),
}))

// "For 5 people · under $15 each", so it's clear the whole group is taken into account
const needsText = computed(() => {
  const parts = [`For ${needs.value.size} ${needs.value.size === 1 ? 'person' : 'people'}`]
  if (BUDGET_TEXT[needs.value.maxPrice]) parts.push(BUDGET_TEXT[needs.value.maxPrice])
  return parts.join(' · ')
})

const DIET_LABELS = {halal: 'Halal', vegetarian: 'Vegetarian' }
const dietLabel = (d) => DIET_LABELS[d] ?? `${d.charAt(0).toUpperCase()}${d.slice(1)} only`

function toggleDiet(d) {
  const label = dietLabel(d)
  const turningOn = !dietOn.value.includes(d)
  dietOn.value = turningOn ? [...dietOn.value, d] : dietOn.value.filter((x) => x !== d)

  // Mirror the toggle in the text box: add the label when switched on, take it out when off
  const parts = message.value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part && part !== label)
  if (turningOn) parts.push(label)
  message.value = parts.join(', ').slice(0, MAX_LENGTH)
}

// A toggle switches off as soon as its label is edited or removed from the text box.
// Not while sending: a finished question clears the box but keeps the toggles on.
let clearingAfterAsk = false
watch(
  message,
  (text) => {
    if (clearingAfterAsk) return
    dietOn.value = dietOn.value.filter((d) => text.includes(dietLabel(d)))
  },
  { flush: 'sync' },
)

const canAsk = computed(() => googlePlacesEnabled.value && !loading.value)

async function ask(text, before = history.value) {
  const asked = text.trim()
  if (!asked || !canAsk.value) return
  loading.value = true
  error.value = ''
  try {
    const answer = await askAssistant({
      message: asked,
      history: before,
      hangout: props.hangout,
      needs: needs.value,
    })
    // The sample spots are made up, so they're never offered for a real hangout's shortlist
    if (answer.sample && !isMockHangout(props.hangout.id)) {
      throw new Error(
        "The assistant isn't set up yet. Add GEMINI_API_KEY and GOOGLE_PLACES_API_KEY to .env.local.",
      )
    }
    lastTurn.value = { text: asked, history: before }
    history.value = [
      ...before,
      { role: 'user', text: asked },
      { role: 'model', text: answer.reply },
    ].slice(-4)
    result.value = {
      reply: answer.reply,
      query: answer.query,
      suggestOtherStations: answer.suggestOtherStations,
    }
    clearingAfterAsk = true
    message.value = ''
    clearingAfterAsk = false
    // An answer that isn't a search (e.g. "hi") leaves the list as it is
    if (answer.query || answer.sample) emit('found', cacheSpots(answer.places))
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function showAll() {
  result.value = null
  lastTurn.value = null
  history.value = []
  error.value = ''
  emit('found', null)
}

defineExpose({ showAll })
</script>

<template>
  <section class="ask" aria-labelledby="ask-label">
    <form class="ask__form" @submit.prevent="ask(message)">
      <label id="ask-label" for="ask-spots-input" class="ask__label"
        >Ask for something specific</label
      >
      <div class="ask__bar">
        <input
          id="ask-spots-input"
          v-model="message"
          type="text"
          class="form-control ask__input"
          :maxlength="MAX_LENGTH"
          placeholder="e.g. prata for dinner, one of us is halal"
          autocomplete="off"
          :disabled="!googlePlacesEnabled"
          aria-describedby="ask-needs"
        />
        <button
          type="submit"
          class="btn btn-primary ask__submit"
          :disabled="!canAsk || !message.trim()"
        >
          {{ loading ? 'Asking…' : 'Ask' }}
        </button>
      </div>
      <p id="ask-needs" class="ask__note">
        <template v-if="googlePlacesEnabled">{{ needsText }}</template>
        <template v-else
          >Turn on Google Places above to ask. Each question uses one search.</template
        >
      </p>
      <div
        v-if="googlePlacesEnabled && groupHas.dietary.length"
        class="ask__diet"
        role="group"
        aria-label="Dietary needs in your group"
      >
        <button
          v-for="d in groupHas.dietary"
          :key="d"
          type="button"
          class="btn ask__chip"
          :class="dietOn.includes(d) ? 'btn-primary' : 'btn-outline-primary'"
          :aria-pressed="dietOn.includes(d)"
          :disabled="loading"
          @click="toggleDiet(d)"
        >
          {{ dietLabel(d) }}
        </button>
        <span class="ask__note">Someone in your group needs this</span>
      </div>
      <p class="ask__note ask__disclaimer">
        Verify with the restaurant if you have any dietary needs or allergies. Gemini is not
        always correct.
      </p>
    </form>

    <p v-if="error" class="ask__error text-danger" role="alert">{{ error }}</p>

    <div aria-live="polite">
      <div v-if="result" class="ask__result">
        <p class="ask__reply">{{ result.reply }}</p>
        <div class="ask__actions">
          <template v-if="result.query">
            <button
              v-for="followUp in FOLLOW_UPS"
              :key="followUp"
              type="button"
              class="btn btn-outline-primary ask__chip"
              :disabled="!canAsk"
              @click="ask(followUp)"
            >
              {{ followUp }}
            </button>
          </template>
          <RouterLink
            v-if="result.suggestOtherStations"
            :to="{ name: 'midpoint', params: { id: hangout.id } }"
            class="btn btn-outline-primary ask__chip"
          >
            Try another station
          </RouterLink>
          <button
            type="button"
            class="btn btn-link ask__chip ask__reset"
            @click="showAll"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ask {
  display: grid;
  gap: 8px;
  margin: 12px 0;
  padding: 14px 16px;
  background: var(--fp-surface);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius-sm);
}

.ask__form {
  display: grid;
  gap: 6px;
}

.ask__label {
  font-weight: 700;
}

.ask__bar {
  display: flex;
  gap: 8px;
}

.ask__input {
  flex: 1;
  min-width: 0;
  min-height: 44px;
}

.ask__submit {
  min-height: 44px;
  min-width: 80px;
  font-weight: 700;
}

.ask__note {
  margin: 0;
  font-size: 0.85rem;
  color: var(--fp-muted);
}

.ask__error {
  margin: 0;
  font-weight: 600;
}

.ask__diet {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.ask__result {
  display: grid;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid var(--fp-border);
}

.ask__reply {
  margin: 0;
}

.ask__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ask__chip {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  border-radius: 999px;
}

.ask__reset {
  color: var(--fp-muted);
}

@media (max-width: 767px) {
  .ask__reset {
    display: none;
  }
}
</style>
