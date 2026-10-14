<script setup>
// 02 Log in / Sign up
// Owner: Matrix · Vet by: Hugo
// Figma frame "02". Split screen: brand panel with a map preview on the left, auth card on the right.
// ?mode=signup opens the Sign up tab; ?redirect=/path is where to go after logging in;
// ?invite=CODE (the link from 05 Create hangout) joins that hangout once logged in.
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { joinByInviteCode } from '@/services/hangouts'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const mode = ref(route.query.mode === 'signup' ? 'signup' : 'login')
const isSignup = computed(() => mode.value === 'signup')

const form = reactive({ name: '', email: '', password: '', remember: true })
const showPassword = ref(false)
const busy = ref(false)
const error = ref('')
const notice = ref('')

// Validation. A field shows its message once it has been left (blur) or after a submit attempt,
// so people aren't told off while they're still typing.
const MIN_PASSWORD = 8
const MAX_NAME = 50
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const touched = reactive({ name: false, email: false, password: false })

function emailError() {
  const email = form.email.trim()
  if (!email) return 'Enter your email.'
  if (!EMAIL_PATTERN.test(email)) return 'Enter a valid email, like name@example.com.'
  return ''
}

const fieldErrors = computed(() => {
  const name = form.name.trim()
  return {
    name: !isSignup.value
      ? ''
      : !name
        ? 'Enter your name.'
        : name.length > MAX_NAME
          ? `Keep your name under ${MAX_NAME} characters.`
          : '',
    email: emailError(),
    // Only sign up checks length: older accounts may have shorter passwords and still need to log in.
    password: !form.password
      ? 'Enter your password.'
      : isSignup.value && form.password.length < MIN_PASSWORD
        ? `Use at least ${MIN_PASSWORD} characters (${form.password.length} so far).`
        : '',
  }
})

// The message to show under each field right now
const shown = computed(() => ({
  name: touched.name ? fieldErrors.value.name : '',
  email: touched.email ? fieldErrors.value.email : '',
  password: touched.password ? fieldErrors.value.password : '',
}))

const fieldIds = { name: 'auth-name', email: 'auth-email', password: 'auth-password' }

function resetValidation() {
  touched.name = touched.email = touched.password = false
}

// Keep the tab in sync with the URL, so "Create an account" links and the back button work.
watch(
  () => route.query.mode,
  (m) => (mode.value = m === 'signup' ? 'signup' : 'login'),
)
watch(mode, () => {
  error.value = ''
  notice.value = ''
  resetValidation()
})

function setMode(m) {
  router.replace({ query: { ...route.query, mode: m === 'signup' ? 'signup' : undefined } })
}

function nextRoute() {
  if (typeof route.query.redirect === 'string') return route.query.redirect
  return isSignup.value ? { name: 'preferences', query: { setup: '1' } } : { name: 'dashboard' }
}

const inviteCode = typeof route.query.invite === 'string' ? route.query.invite : null

// Leave the page once logged in: join the invited hangout first if there is one.
let leaving = false
async function finish() {
  if (leaving) return
  leaving = true
  try {
    if (inviteCode) {
      const id = await joinByInviteCode(inviteCode)
      router.push({ name: 'starting-points', params: { id } })
    } else {
      router.push(nextRoute())
    }
  } catch (e) {
    leaving = false
    error.value = e.message || 'Could not join that hangout.'
  }
}

// Someone opening an invite link while already logged in (or coming back from Google) joins straight away.
watch(
  () => auth.ready && auth.isLoggedIn,
  (loggedIn) => {
    if (loggedIn && inviteCode) finish()
  },
  { immediate: true },
)

async function submit() {
  error.value = ''
  notice.value = ''

  touched.name = touched.email = touched.password = true
  const firstInvalid = Object.keys(fieldIds).find((key) => fieldErrors.value[key])
  if (firstInvalid) {
    await nextTick()
    document.getElementById(fieldIds[firstInvalid])?.focus()
    return
  }

  const email = form.email.trim()
  busy.value = true
  try {
    if (isSignup.value) {
      const needsConfirm = await auth.signUp(email, form.password, form.name.trim())
      if (needsConfirm) {
        notice.value = 'Check your inbox to confirm your email, then log in.'
        return
      }
    } else {
      await auth.signIn(email, form.password)
    }
    await finish()
  } catch (e) {
    error.value = e.message || 'Something went wrong. Please try again.'
  } finally {
    busy.value = false
  }
}

async function google() {
  error.value = ''
  try {
    // With an invite, come back to this page so the watcher above can join the hangout.
    const target = inviteCode ? route.fullPath : router.resolve(nextRoute()).href
    await auth.signInWithGoogle(window.location.origin + target)
    if (auth.isLoggedIn) await finish() // mock mode logs in without leaving the page
  } catch (e) {
    error.value = e.message
  }
}

async function forgotPassword() {
  error.value = ''
  notice.value = ''
  touched.email = true
  if (fieldErrors.value.email) {
    document.getElementById(fieldIds.email)?.focus()
    return
  }
  const email = form.email.trim()
  try {
    await auth.resetPassword(email)
    notice.value = `If ${email} has an account, a reset link is on its way.`
  } catch (e) {
    error.value = e.message
  }
}

// Map preview pins, in the SVG's 450×275 viewBox
const friends = [
  { initial: 'N', x: 183, y: 46, color: 'var(--auth-pink)' },
  { initial: 'S', x: 385, y: 128, color: 'var(--fp-accent)' },
  { initial: 'R', x: 64, y: 165, color: 'var(--auth-purple)' },
]
const midpoint = { x: 229, y: 128 }

const avatars = [
  { initial: 'S', color: 'var(--fp-accent)' },
  { initial: 'N', color: 'var(--auth-pink)' },
  { initial: 'H', color: 'var(--auth-blue)' },
  { initial: 'M', color: 'var(--auth-amber)' },
]
</script>

<template>
  <main class="auth">
    <aside class="brand-panel">
      <RouterLink class="logo" :to="{ name: 'landing' }">
        <span class="logo__mark" aria-hidden="true"> <span></span><span></span><span></span> </span>
        Fairpoint
      </RouterLink>

      <div class="brand-panel__copy">
        <h1 class="brand-panel__title">Stop arguing about where to meet.</h1>
        <p class="brand-panel__lead">
          Fairpoint picks the fairest spot for everyone, then lets the group vote on what to do.
        </p>
      </div>

      <svg
        class="map"
        viewBox="0 0 450 275"
        role="img"
        aria-label="Three friends meeting at a fair midpoint"
      >
        <defs>
          <radialGradient id="auth-heat-red">
            <stop offset="0%" stop-color="var(--fp-accent)" stop-opacity="0.75" />
            <stop offset="100%" stop-color="var(--fp-accent)" stop-opacity="0" />
          </radialGradient>
          <radialGradient id="auth-heat-amber">
            <stop offset="0%" stop-color="var(--auth-amber)" stop-opacity="0.75" />
            <stop offset="100%" stop-color="var(--auth-amber)" stop-opacity="0" />
          </radialGradient>
        </defs>
        <rect width="450" height="275" class="map__ground" />

        <ellipse cx="270" cy="-5" rx="70" ry="25" class="map__water" />
        <ellipse cx="225" cy="290" rx="300" ry="50" class="map__water" />
        <rect x="25" y="60" width="70" height="40" rx="18" class="map__park" />
        <rect x="370" y="70" width="65" height="45" rx="20" class="map__park" />
        <rect x="80" y="175" width="55" height="35" rx="16" class="map__park" />
        <rect x="270" y="170" width="65" height="35" rx="16" class="map__park" />

        <g class="map__road">
          <path d="M0 75 L450 80" />
          <path d="M0 150 L450 140" />
          <path d="M0 175 L450 195" />
          <path d="M135 0 L120 275" />
          <path d="M225 0 L235 275" />
          <path d="M290 0 L315 275" />
          <path d="M385 145 L450 130" />
        </g>
        <g class="map__road map__road--major">
          <path d="M65 0 C80 70 100 150 50 275" />
          <path d="M405 0 C370 90 360 180 410 275" />
          <path d="M0 125 C120 110 300 120 450 115" />
        </g>

        <circle cx="230" cy="135" r="95" fill="url(#auth-heat-red)" />
        <circle cx="110" cy="70" r="40" fill="url(#auth-heat-amber)" />

        <line
          v-for="f in friends"
          :key="`route-${f.initial}`"
          :x1="f.x"
          :y1="f.y"
          :x2="midpoint.x"
          :y2="midpoint.y"
          :stroke="f.color"
          class="map__route"
        />
        <circle :cx="midpoint.x" :cy="midpoint.y" r="38" class="map__halo" />
        <circle :cx="midpoint.x" :cy="midpoint.y" r="22" class="map__halo" />
        <circle :cx="midpoint.x" :cy="midpoint.y" r="8" class="map__mid" />

        <g v-for="f in friends" :key="`pin-${f.initial}`" class="map__pin">
          <circle :cx="f.x" :cy="f.y" r="14" :fill="f.color" />
          <text :x="f.x" :y="f.y" dy="0.35em" text-anchor="middle">{{ f.initial }}</text>
        </g>
      </svg>

      <div class="social-proof">
        <span class="avatars" aria-hidden="true">
          <span v-for="a in avatars" :key="a.initial" :style="{ background: a.color }">
            {{ a.initial }}
          </span>
        </span>
        Your friends are already planning
      </div>
    </aside>

    <section class="form-side">
      <div class="auth-card">
        <div class="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            class="tabs__tab"
            :class="{ 'is-active': !isSignup }"
            :aria-selected="!isSignup"
            @click="setMode('login')"
          >
            Log in
          </button>
          <button
            type="button"
            role="tab"
            class="tabs__tab"
            :class="{ 'is-active': isSignup }"
            :aria-selected="isSignup"
            @click="setMode('signup')"
          >
            Sign up
          </button>
        </div>

        <p v-if="inviteCode" class="alert alert-success py-2 small" role="status">
          You’ve been invited to a hangout. {{ isSignup ? 'Sign up' : 'Log in' }} to join it.
        </p>

        <h2 class="auth-card__title">{{ isSignup ? 'Create your account' : 'Welcome back' }}</h2>
        <p class="auth-card__sub">
          {{ isSignup ? 'Start planning fairer hangouts.' : 'Log in to see your hangouts.' }}
        </p>

        <form novalidate @submit.prevent="submit">
          <div v-if="isSignup" class="field">
            <label for="auth-name" class="form-label">Name</label>
            <input
              id="auth-name"
              v-model="form.name"
              class="form-control"
              :class="{ 'is-invalid': shown.name }"
              type="text"
              autocomplete="name"
              placeholder="What friends call you"
              required
              :aria-invalid="Boolean(shown.name)"
              aria-describedby="auth-name-error"
              @blur="touched.name = true"
            />
            <p v-if="shown.name" id="auth-name-error" class="field-error">{{ shown.name }}</p>
          </div>

          <div class="field">
            <label for="auth-email" class="form-label">Email</label>
            <input
              id="auth-email"
              v-model="form.email"
              class="form-control"
              :class="{ 'is-invalid': shown.email }"
              type="email"
              autocomplete="email"
              placeholder="you@example.com"
              required
              :aria-invalid="Boolean(shown.email)"
              aria-describedby="auth-email-error"
              @blur="touched.email = true"
            />
            <p v-if="shown.email" id="auth-email-error" class="field-error">{{ shown.email }}</p>
          </div>

          <div class="field">
            <label for="auth-password" class="form-label">Password</label>
            <div class="password">
              <input
                id="auth-password"
                v-model="form.password"
                class="form-control"
                :class="{ 'is-invalid': shown.password }"
                :type="showPassword ? 'text' : 'password'"
                :autocomplete="isSignup ? 'new-password' : 'current-password'"
                :placeholder="isSignup ? `At least ${MIN_PASSWORD} characters` : ''"
                required
                :minlength="isSignup ? MIN_PASSWORD : undefined"
                :aria-invalid="Boolean(shown.password)"
                aria-describedby="auth-password-help"
                @blur="touched.password = true"
              />
              <button
                type="button"
                class="password__toggle"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? 'Hide' : 'Show' }}
              </button>
            </div>
            <p v-if="shown.password" id="auth-password-help" class="field-error">
              {{ shown.password }}
            </p>
            <p
              v-else-if="isSignup"
              id="auth-password-help"
              class="field-hint"
              :class="{ 'field-hint--ok': form.password.length >= MIN_PASSWORD }"
            >
              {{
                form.password.length >= MIN_PASSWORD
                  ? '✓ Long enough'
                  : `At least ${MIN_PASSWORD} characters`
              }}
            </p>
          </div>

          <div v-if="!isSignup" class="options">
            <div class="form-check mb-0">
              <input
                id="auth-remember"
                v-model="form.remember"
                class="form-check-input"
                type="checkbox"
              />
              <label class="form-check-label" for="auth-remember">Remember me</label>
            </div>
            <button type="button" class="link-btn" @click="forgotPassword">Forgot password?</button>
          </div>

          <p v-if="error" class="alert alert-danger py-2 small" role="alert">{{ error }}</p>
          <p v-if="notice" class="alert alert-success py-2 small" role="status">{{ notice }}</p>

          <button type="submit" class="btn btn-primary w-100 submit" :disabled="busy">
            <span
              v-if="busy"
              class="spinner-border spinner-border-sm me-2"
              aria-hidden="true"
            ></span>
            {{ isSignup ? 'Create account' : 'Log in' }}
          </button>
        </form>

        <div class="divider"><span>or</span></div>

        <button type="button" class="btn google" @click="google">
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path
              fill="#FFC107"
              d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"
            />
            <path
              fill="#FF3D00"
              d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"
            />
          </svg>
          Continue with Google
        </button>

        <p class="switch">
          <template v-if="isSignup">
            Already have an account?
            <button type="button" class="link-btn" @click="setMode('login')">Log in</button>
          </template>
          <template v-else>
            New to Fairpoint?
            <button type="button" class="link-btn" @click="setMode('signup')">
              Create an account
            </button>
          </template>
        </p>
      </div>
    </section>
  </main>
</template>

<style scoped>
.auth {
  /* Illustration-only colours for the map preview and avatars */
  --auth-pink: #d6528f;
  --auth-blue: #4a7fe8;
  --auth-purple: #7056e0;
  --auth-amber: #f2b33d;
  --auth-panel: #275b4f;

  display: grid;
  grid-template-columns: minmax(0, 43fr) minmax(0, 57fr);
  min-height: calc(100vh - 57px); /* fill the screen below the navbar */
  background: var(--fp-bg);
}

/* Left brand panel */
.brand-panel {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  padding: 3rem 3.5rem 3.5rem;
  background: var(--auth-panel);
  color: var(--fp-surface);
}

.logo {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  color: inherit;
  font-size: 1.25rem;
  font-weight: 800;
  text-decoration: none;
}

.logo__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: var(--fp-surface);
}

.logo__mark span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--fp-primary);
}

.logo__mark span:nth-child(2) {
  background: var(--fp-accent);
}

.brand-panel__copy {
  margin-top: auto;
}

.brand-panel__title {
  max-width: 24rem;
  margin-bottom: 1rem;
  font-size: clamp(2rem, 3.2vw, 2.75rem);
  font-weight: 800;
  line-height: 1.08;
  letter-spacing: -0.03em;
}

.brand-panel__lead {
  max-width: 21rem;
  margin: 0;
  color: rgb(255 255 255 / 0.75);
  font-size: 1.05rem;
  line-height: 1.55;
}

.map {
  display: block;
  width: 100%;
  max-width: 460px;
  height: auto;
  border-radius: var(--fp-radius-sm);
}

.map__ground {
  fill: #e9ece4;
}

.map__water {
  fill: #cfdfe6;
}

.map__park {
  fill: #cfe0c3;
  opacity: 0.8;
}

.map__road path {
  fill: none;
  stroke: var(--fp-surface);
  stroke-width: 4;
}

.map__road--major path {
  stroke: #f2d48f;
  stroke-width: 6;
}

.map__route {
  stroke-width: 2;
  stroke-dasharray: 5 4;
}

.map__halo {
  fill: rgb(0 0 0 / 0.1);
}

.map__mid {
  fill: var(--fp-primary);
  stroke: var(--fp-surface);
  stroke-width: 3;
}

.map__pin circle {
  stroke: var(--fp-surface);
  stroke-width: 2.5;
}

.map__pin text {
  fill: var(--fp-surface);
  font-size: 11px;
  font-weight: 700;
}

.social-proof {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: auto;
  font-size: 0.9rem;
}

.avatars {
  display: inline-flex;
}

.avatars span {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 2px solid var(--auth-panel);
  border-radius: 50%;
  font-size: 0.7rem;
  font-weight: 700;
}

.avatars span + span {
  margin-left: -8px;
}

/* Right form side */
.form-side {
  display: grid;
  place-items: center;
  padding: 3rem 1.5rem;
}

.auth-card {
  width: 100%;
  max-width: 400px;
  padding: 2rem;
  background: var(--fp-surface);
  border-radius: var(--fp-radius);
  box-shadow: 0 10px 40px rgb(0 0 0 / 0.08);
}

.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 4px;
  margin-bottom: 1.75rem;
  border-radius: var(--fp-radius-sm);
  background: var(--fp-bg);
}

.tabs__tab {
  padding: 0.5rem;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--fp-muted);
  font-size: 0.85rem;
}

.tabs__tab.is-active {
  background: var(--fp-surface);
  color: var(--fp-ink);
  font-weight: 600;
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.08);
}

.auth-card__title {
  margin-bottom: 0.25rem;
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.auth-card__sub {
  margin-bottom: 1.5rem;
  color: var(--fp-muted);
  font-size: 0.9rem;
}

.field {
  margin-bottom: 1.1rem;
}

.form-label {
  margin-bottom: 0.4rem;
  font-size: 0.85rem;
  font-weight: 600;
}

.form-control {
  padding: 0.7rem 0.9rem;
  background-color: var(--fp-surface);
  font-size: 0.9rem;
}

.form-control:focus {
  border-color: var(--fp-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--fp-primary) 15%, transparent);
}

.form-control.is-invalid {
  border-color: var(--bs-form-invalid-border-color);
  background-image: none; /* Bootstrap's icon would sit under the Show button */
}

.form-control.is-invalid:focus {
  box-shadow: 0 0 0 3px rgba(var(--bs-danger-rgb), 0.15);
}

.field-error,
.field-hint {
  margin: 0.35rem 0 0;
  font-size: 0.8rem;
}

.field-error {
  color: var(--bs-form-invalid-color);
}

.field-hint {
  color: var(--fp-muted);
}

.field-hint--ok {
  color: var(--fp-primary);
}

.password {
  position: relative;
}

.password .form-control {
  padding-right: 4rem;
}

.password__toggle {
  position: absolute;
  top: 50%;
  right: 0.75rem;
  transform: translateY(-50%);
  border: 0;
  background: none;
  color: var(--fp-primary);
  font-size: 0.85rem;
  font-weight: 600;
}

.options {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  font-size: 0.85rem;
}

.form-check-input:checked {
  background-color: var(--fp-primary);
  border-color: var(--fp-primary);
}

.form-check-input:focus {
  border-color: var(--fp-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--fp-primary) 15%, transparent);
}

.link-btn {
  padding: 0;
  border: 0;
  background: none;
  color: var(--fp-primary);
  font-weight: 600;
}

.link-btn:hover {
  color: var(--fp-primary-dark);
  text-decoration: underline;
}

.submit {
  padding: 0.75rem;
  font-weight: 600;
}

.divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-block: 1.25rem;
  color: var(--fp-muted);
  font-size: 0.75rem;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--fp-border);
}

.google {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--fp-border);
  background: var(--fp-surface);
  font-weight: 600;
}

.google:hover {
  background: var(--fp-bg);
}

.switch {
  margin: 1.25rem 0 0;
  color: var(--fp-muted);
  font-size: 0.85rem;
}

/* Responsive: stack, and keep just the headline from the brand panel */
@media (max-width: 991.98px) {
  .auth {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }

  .brand-panel {
    gap: 1.5rem;
    padding: 2rem 1.5rem;
  }

  .brand-panel__copy {
    margin-top: 0;
  }

  .map,
  .social-proof {
    display: none;
  }

  .form-side {
    place-items: start center;
    padding-block: 2rem;
  }
}

@media (max-width: 575.98px) {
  .form-side {
    padding-inline: 1rem;
  }

  .auth-card {
    padding: 1.5rem;
  }
}
</style>
