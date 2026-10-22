<script setup>
// 03 User preferences
// Owner: Matrix · Vet by: Hugo
// Figma frame "03". Reads and writes the logged-in user's profiles row.
// ?setup=1 (sent by sign up) shows the onboarding progress bar and "Skip for now".
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { hasSupabase } from '@/services/supabase'
import { defaultPreferences, getProfile, saveProfile } from '@/services/profiles'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const isSetup = computed(() => route.query.setup === '1')

// Values are what gets stored in profiles.activities / profiles.dietary
const activityOptions = [
  { value: 'cafes', label: 'Cafes', emoji: '☕', color: 'teal' },
  { value: 'food', label: 'Food spots', emoji: '🍜', color: 'orange' },
  { value: 'board_games', label: 'Board games', emoji: '🎲', color: 'purple' },
  { value: 'outdoor', label: 'Outdoor & parks', emoji: '🌳', color: 'green' },
  { value: 'museums', label: 'Museums', emoji: '🏛️', color: 'blue' },
  { value: 'shopping', label: 'Shopping', emoji: '🛍️', color: 'pink' },
  { value: 'arcades', label: 'Arcades', emoji: '🕹️', color: 'purple' },
  { value: 'karaoke', label: 'Karaoke', emoji: '🎤', color: 'pink' },
  { value: 'sports', label: 'Sports', emoji: '⚽', color: 'green' },
  { value: 'movies', label: 'Movies', emoji: '🎬', color: 'blue' },
  { value: 'study', label: 'Study spots', emoji: '📚', color: 'blue' },
]

const dietaryOptions = [
  { value: 'halal', label: 'Halal', emoji: '☪️', color: 'teal' },
  { value: 'vegetarian', label: 'Vegetarian', emoji: '🥬', color: 'green' },
  { value: 'no_beef', label: 'No beef', emoji: '🚫', color: 'orange' },
  { value: 'no_seafood', label: 'No seafood', emoji: '🐟', color: 'blue' },
]

const budgetOptions = [
  { value: 1, symbol: '$', label: 'Under $15' },
  { value: 2, symbol: '$$', label: '$15–30' },
  { value: 3, symbol: '$$$', label: '$30+' },
]

const comfortOptions = [
  {
    key: 'indoor_if_rain',
    label: 'Go indoors when it rains',
    hint: 'Uses live weather to favour indoor spots',
  },
  {
    key: 'avoid_crowds',
    label: 'Avoid crowded places',
    hint: 'Uses the crowd heat map to rank quieter spots',
  },
  { key: 'step_free', label: 'Step-free access only', hint: 'Lifts and ramps at the venue' },
]

const travel = { min: 10, max: 90, step: 5 }

const prefs = reactive(structuredClone(defaultPreferences))
const displayName = ref('')
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const saved = ref(false)

// Validation. The chips, budget and slider only offer fixed choices, so the checks are:
// at least one activity (ranking needs something to go on), and cleaning values loaded from
// the database (an older version may have saved an option we no longer offer).
const showErrors = ref(false)
const activitiesPanel = ref(null)

const activitiesError = computed(() =>
  prefs.activities.length === 0 ? 'Pick at least one so we can suggest spots you’ll enjoy.' : '',
)
const shownActivitiesError = computed(() => (showErrors.value ? activitiesError.value : ''))

function clean(profile) {
  const known = (options) => new Set(options.map((o) => o.value))
  const activities = known(activityOptions)
  const dietary = known(dietaryOptions)
  const budgets = known(budgetOptions)
  const mins = Number(profile.max_travel_mins)

  return {
    activities: (profile.activities ?? []).filter((a) => activities.has(a)),
    dietary: (profile.dietary ?? []).filter((d) => dietary.has(d)),
    budget: budgets.has(profile.budget) ? profile.budget : defaultPreferences.budget,
    max_travel_mins: Number.isFinite(mins)
      ? Math.min(travel.max, Math.max(travel.min, Math.round(mins / travel.step) * travel.step))
      : defaultPreferences.max_travel_mins,
    indoor_if_rain: Boolean(profile.indoor_if_rain),
    avoid_crowds: Boolean(profile.avoid_crowds),
    step_free: Boolean(profile.step_free),
  }
}

const userId = computed(() => auth.user?.id ?? (hasSupabase ? null : 'mock-user'))

// Load once we know who is logged in
watch(
  () => auth.ready && userId.value,
  async (id) => {
    if (!auth.ready) return
    if (!id) {
      loading.value = false
      return
    }
    loading.value = true
    error.value = ''
    try {
      const profile = await getProfile(id)
      Object.assign(prefs, clean(profile))
      displayName.value =
        profile.display_name ||
        auth.user?.user_metadata?.display_name ||
        auth.user?.email?.split('@')[0] ||
        'Friend'
    } catch (e) {
      error.value = e.message || 'Could not load your preferences.'
    } finally {
      loading.value = false
    }
  },
  { immediate: true },
)

function toggle(list, value) {
  const i = list.indexOf(value)
  if (i === -1) list.push(value)
  else list.splice(i, 1)
}

// Ask first, then put every choice back to the defaults. Nothing is saved until they press Save preferences.
function resetPreferences() {
  const sure = window.confirm('Reset all your preferences to the defaults?')
  if (!sure) {
    return
  }
  prefs.activities = defaultPreferences.activities.slice()
  prefs.dietary = defaultPreferences.dietary.slice()
  prefs.budget = defaultPreferences.budget
  prefs.max_travel_mins = defaultPreferences.max_travel_mins
  prefs.indoor_if_rain = defaultPreferences.indoor_if_rain
  prefs.avoid_crowds = defaultPreferences.avoid_crowds
  prefs.step_free = defaultPreferences.step_free
  showErrors.value = false
}

const noRestrictions = computed(() => prefs.dietary.length === 0)

const setupStep = ref(0)
const setupTotal = 4
const setupStepLabel = computed(() => {
  if (setupStep.value === 0) return 'Let’s get started'
  return `Step ${setupStep.value} of ${setupTotal}`
})

async function nextSetupStep() {
  if (setupStep.value === 1) {
    showErrors.value = true
    if (activitiesError.value) {
      await nextTick()
      activitiesPanel.value?.querySelector('.chip')?.focus()
      return
    }
  }

  if (setupStep.value < setupTotal) {
    setupStep.value += 1
    showErrors.value = false
  } else {
    await save()
  }
}

function previousSetupStep() {
  if (setupStep.value > 0) {
    setupStep.value -= 1
    showErrors.value = false
    error.value = ''
  }
}

async function skipSetupStep() {
  if (setupStep.value < setupTotal) {
    setupStep.value += 1
    showErrors.value = false
    error.value = ''
  } else {
    await save()
  }
}

// Slider fill: CSS needs the % of the track that's filled
const travelFill = computed(
  () => `${((prefs.max_travel_mins - travel.min) / (travel.max - travel.min)) * 100}%`,
)

watch(prefs, () => (saved.value = false))

async function save() {
  error.value = ''
  showErrors.value = true
  if (activitiesError.value && !isSetup.value) {
    await nextTick()
    activitiesPanel.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    activitiesPanel.value?.querySelector('.chip')?.focus({ preventScroll: true })
    return
  }

  saving.value = true
  try {
    await saveProfile(userId.value, displayName.value, clean(prefs))
    if (isSetup.value) {
      router.push({ name: 'dashboard' })
    } else {
      saved.value = true
    }
  } catch (e) {
    error.value = e.message || 'Could not save. Please try again.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <main class="container prefs">
    <header class="prefs__header">
      <div>
        <h1 class="prefs__title">Tell us what you like</h1>
        <p class="prefs__sub">
          {{
            isSetup
              ? 'Answer a few quick questions to personalise your recommendations.'
              : 'Fairpoint uses this to rank cafes and activities for your group.'
          }}
        </p>
      </div>
      <div v-if="isSetup" class="progress-step">
        <span>{{ setupStepLabel }}</span>
        <div class="progress-step__bar">
          <span :style="{ width: `${(setupStep / setupTotal) * 100}%` }"></span>
        </div>
      </div>
    </header>

    <div v-if="!userId && auth.ready" class="panel text-center">
      <p class="mb-3">Log in to set your preferences.</p>
      <RouterLink
        class="btn btn-primary"
        :to="{ name: 'auth', query: { redirect: route.fullPath } }"
      >
        Log in
      </RouterLink>
    </div>

    <div v-else-if="loading" class="text-center py-5 text-secondary">
      <span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
      Loading your preferences…
    </div>

    <form v-else id="prefs-form" novalidate @submit.prevent="isSetup ? nextSetupStep() : save()">
      <section v-if="isSetup && setupStep === 0" class="panel setup-intro">
        <h2 class="panel__title">Tell us what you like</h2>
        <p class="panel__sub">
          Your answers help Fairpoint suggest places that work for you and your group.
        </p>
        <button type="submit" class="btn btn-primary">Get started</button>
      </section>

      <div v-else class="prefs__grid" :class="{ 'prefs__grid--setup': isSetup }">
        <div class="prefs__col">
          <section
            v-if="!isSetup || setupStep === 1"
            ref="activitiesPanel"
            class="panel"
            :class="{ 'panel--invalid': shownActivitiesError }"
          >
            <h2 id="prefs-activities-title" class="panel__title">
              What do you enjoy?
              <span class="panel__count"
                >{{ prefs.activities.length }}/{{ activityOptions.length }} selected</span
              >
            </h2>
            <p class="panel__sub">Pick at least one, as many as you like</p>
            <div
              class="chips"
              role="group"
              aria-labelledby="prefs-activities-title"
              aria-describedby="prefs-activities-error"
            >
              <button
                v-for="o in activityOptions"
                :key="o.value"
                type="button"
                class="chip"
                :class="[`chip--${o.color}`, { 'is-on': prefs.activities.includes(o.value) }]"
                :aria-pressed="prefs.activities.includes(o.value)"
                @click="toggle(prefs.activities, o.value)"
              >
                <span class="chip__emoji" aria-hidden="true">{{ o.emoji }}</span>
                {{ o.label }}
              </button>
            </div>
            <p
              v-if="shownActivitiesError"
              id="prefs-activities-error"
              class="field-error"
              role="alert"
            >
              {{ shownActivitiesError }}
            </p>
          </section>

          <section v-if="!isSetup || setupStep === 2" class="panel dietary-panel">
            <h2 id="prefs-dietary-title" class="panel__title">
              Dietary needs
              <span class="panel__count"
                >{{ prefs.dietary.length }}/{{ dietaryOptions.length }} selected</span
              >
            </h2>
            <p class="panel__sub">We only suggest food spots that fit everyone</p>
            <div class="chips" role="group" aria-labelledby="prefs-dietary-title">
              <button
                v-for="o in dietaryOptions"
                :key="o.value"
                type="button"
                class="chip"
                :class="[`chip--${o.color}`, { 'is-on': prefs.dietary.includes(o.value) }]"
                :aria-pressed="prefs.dietary.includes(o.value)"
                @click="toggle(prefs.dietary, o.value)"
              >
                <span class="chip__emoji" aria-hidden="true">{{ o.emoji }}</span>
                {{ o.label }}
              </button>
              <button
                type="button"
                class="chip"
                :class="['chip--orange', { 'is-on': noRestrictions }]"
                :aria-pressed="noRestrictions"
                @click="prefs.dietary = []"
              >
                <span class="chip__emoji" aria-hidden="true">✅</span>
                No restrictions
              </button>
            </div>
          </section>
        </div>

        <div class="prefs__col">
          <section v-if="!isSetup || setupStep === 3" class="panel">
            <h2 class="panel__title">Budget per person</h2>
            <p class="panel__sub">Used to filter spots by price level</p>
            <div class="segmented" role="radiogroup" aria-label="Budget per person">
              <button
                v-for="o in budgetOptions"
                :key="o.value"
                type="button"
                role="radio"
                class="segmented__opt"
                :class="{ 'is-on': prefs.budget === o.value }"
                :aria-checked="prefs.budget === o.value"
                @click="prefs.budget = o.value"
              >
                {{ o.symbol }} {{ o.label }}
              </button>
            </div>
          </section>

          <section v-if="!isSetup || setupStep === 4" class="panel">
            <h2 class="panel__title mb-3">Travel &amp; comfort</h2>

            <div class="travel">
              <label for="prefs-travel" class="travel__label">Max travel time</label>
              <span class="travel__value">{{ prefs.max_travel_mins }} min</span>
            </div>
            <input
              id="prefs-travel"
              v-model.number="prefs.max_travel_mins"
              class="range"
              type="range"
              :min="travel.min"
              :max="travel.max"
              :step="travel.step"
              :style="{ '--fill': travelFill }"
            />

            <ul class="toggles">
              <li v-for="o in comfortOptions" :key="o.key" class="toggle-row">
                <div>
                  <label :for="`prefs-${o.key}`" class="toggle-row__label">{{ o.label }}</label>
                  <p class="toggle-row__hint">{{ o.hint }}</p>
                </div>
                <div class="form-check form-switch mb-0">
                  <input
                    :id="`prefs-${o.key}`"
                    v-model="prefs[o.key]"
                    class="form-check-input"
                    type="checkbox"
                    role="switch"
                  />
                </div>
              </li>
            </ul>
          </section>
        </div>
      </div>

      <p v-if="error" class="alert alert-danger py-2 small mt-3 mb-0" role="alert">{{ error }}</p>

      <footer v-if="!isSetup || setupStep > 0" class="actions">
        <div class="actions__buttons">
          <span v-if="saved" class="actions__saved" role="status">Saved ✓</span>
          <button
            v-if="isSetup"
            type="button"
            class="btn btn-light btn-skip"
            @click="skipSetupStep"
          >
            Skip for now
          </button>
          <button
            v-if="!isSetup"
            type="button"
            class="btn btn-outline-primary btn-reset"
            @click="resetPreferences"
          >
            Reset preferences
          </button>
          <button
            v-if="isSetup && setupStep > 0"
            type="button"
            class="btn btn-outline-primary btn-back"
            @click="previousSetupStep"
          >
            Back
          </button>
          <button type="submit" class="btn btn-primary btn-save" :disabled="saving">
            <span
              v-if="saving"
              class="spinner-border spinner-border-sm me-2"
              aria-hidden="true"
            ></span>
            {{
              isSetup
                ? setupStep === setupTotal
                  ? 'Save preferences'
                  : 'Next'
                : 'Save preferences'
            }}
          </button>
        </div>
      </footer>
    </form>
  </main>
</template>

<style scoped>
.prefs {
  max-width: 1060px;
  padding-block: 2rem 4rem;
}

.prefs__header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.prefs__title {
  margin-bottom: 0.4rem;
  font-size: 1.85rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.prefs__sub {
  margin: 0;
  color: var(--fp-muted);
}

.progress-step {
  width: 190px;
  color: var(--fp-muted);
  font-size: 0.8rem;
  text-align: right;
}

.progress-step__bar {
  height: 4px;
  margin-top: 0.6rem;
  border-radius: 999px;
  background: var(--fp-border);
  overflow: hidden;
}

.progress-step__bar span {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--fp-primary);
}

.prefs__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
  align-items: start;
}

.prefs__grid--setup {
  grid-template-columns: minmax(0, 1fr);
  max-width: 680px;
  margin-inline: auto;
}

.prefs__grid--setup .prefs__col {
  display: contents;
}

.prefs__col {
  display: grid;
  gap: 1.25rem;
}

.setup-intro {
  max-width: 680px;
  margin-inline: auto;
  text-align: center;
}

.panel {
  padding: 1.5rem;
  background: var(--fp-surface);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
}

.dietary-panel {
  min-height: 13rem;
}

.panel__title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.2rem;
  font-size: 1.1rem;
  font-weight: 700;
}

.panel__count {
  flex-shrink: 0;
  color: var(--fp-muted);
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.panel__sub {
  margin-bottom: 1rem;
  color: var(--fp-muted);
  font-size: 0.8rem;
}

.panel--invalid {
  border-color: var(--bs-form-invalid-border-color);
}

.field-error {
  margin: 0.75rem 0 0;
  color: var(--bs-form-invalid-color);
  font-size: 0.8rem;
}

/* Chips */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.chip {
  padding: 0.45rem 1rem;
  border: 1px solid var(--fp-border);
  border-radius: 999px;
  background: var(--fp-surface);
  color: var(--fp-ink);
  font-size: 0.85rem;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    color 0.15s ease;
}

.chip__emoji {
  margin-right: 0.35rem;
}

.chip:hover {
  border-color: var(--fp-primary);
}

.chip.is-on {
  border-color: var(--chip-color);
  background: var(--chip-background);
  color: var(--chip-ink);
  font-weight: 700;
}

.chip--teal {
  --chip-color: #0f9d91;
  --chip-background: #dcefed;
  --chip-ink: #155e59;
}

.chip--orange {
  --chip-color: #f47721;
  --chip-background: #fff0e6;
  --chip-ink: #93410f;
}

.chip--blue {
  --chip-color: #4b7bec;
  --chip-background: #e5edff;
  --chip-ink: #284eaa;
}

.chip--pink {
  --chip-color: #df4b91;
  --chip-background: #fbe5f0;
  --chip-ink: #96305e;
}

.chip--green {
  --chip-color: #39a75a;
  --chip-background: #e2f2e6;
  --chip-ink: #24703b;
}

.chip--purple {
  --chip-color: #8b62d9;
  --chip-background: #eee8fb;
  --chip-ink: #5d3c9e;
}

/* Budget */
.segmented {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 4px;
  border-radius: var(--fp-radius-sm);
  background: var(--fp-bg);
}

.segmented__opt {
  padding: 0.55rem 0.25rem;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--fp-muted);
  font-size: 0.85rem;
}

.segmented__opt.is-on {
  background: var(--fp-surface);
  color: var(--fp-ink);
  font-weight: 700;
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.08);
}

/* Travel slider */
.travel {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.6rem;
  font-size: 0.9rem;
}

.travel__value {
  color: var(--fp-primary);
  font-weight: 700;
}

.range {
  width: 100%;
  height: 5px;
  border-radius: 999px;
  background: linear-gradient(to right, var(--fp-primary) var(--fill), var(--fp-bg) var(--fill));
  appearance: none;
  cursor: pointer;
}

.range::-webkit-slider-thumb {
  width: 18px;
  height: 18px;
  border: 2px solid var(--fp-primary);
  border-radius: 50%;
  background: var(--fp-surface);
  appearance: none;
}

.range::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border: 2px solid var(--fp-primary);
  border-radius: 50%;
  background: var(--fp-surface);
}

.range:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--fp-primary) 40%, transparent);
  outline-offset: 6px;
}

/* Toggles */
.toggles {
  padding: 0;
  margin: 1.25rem 0 0;
  border-top: 1px solid var(--fp-border);
  list-style: none;
}

.toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding-top: 1rem;
}

.toggle-row__label {
  font-size: 0.9rem;
  font-weight: 600;
}

.toggle-row__hint {
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

/* Footer */
.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end; /* was space-between: keep the buttons on the right */
  align-items: center;
  gap: 1rem;
  margin-top: 1.25rem;
}

.actions__buttons {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.actions__saved {
  color: var(--fp-primary);
  font-size: 0.9rem;
  font-weight: 600;
}

.btn-skip,
.btn-reset,
.btn-save {
  padding: 0.7rem 1.25rem;
  font-weight: 600;
}

.btn-skip {
  border-color: var(--fp-border);
  background: var(--fp-surface);
}

@media (max-width: 767.98px) {
  .prefs__grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .prefs__grid--setup {
    max-width: none;
  }

  .dietary-panel {
    min-height: 0;
  }

  .actions__buttons {
    width: 100%;
    flex-direction: column-reverse;
  }

  .actions__buttons .btn {
    width: 100%;
  }
}
</style>
