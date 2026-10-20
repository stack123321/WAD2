<script setup>
// 02 Log in / Sign up
// Owner: Matrix · Vet by: Hugo
// Figma frame "02" (Direction C): one centred column with the headline, a Log in / Sign up switch
// and the form.
// ?mode=signup opens Sign up; ?redirect=/path is where to go after logging in;
// ?invite=CODE (the link from 05 Create hangout) joins that hangout once logged in;
// ?mode=reset is where the "Forgot password" email link lands, to set a new password.
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { hasSupabase } from '@/services/supabase'
import { joinByInviteCode } from '@/services/hangouts'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const modeFrom = (m) => (m === 'signup' || m === 'reset' ? m : 'login')
const mode = ref(modeFrom(route.query.mode))
const isSignup = computed(() => mode.value === 'signup')
const isReset = computed(() => mode.value === 'reset')

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
  (m) => (mode.value = modeFrom(m)),
)
watch(mode, () => {
  error.value = ''
  notice.value = ''
  resetValidation()
})

function setMode(m) {
  const query = { ...route.query }
  if (m === 'login') delete query.mode
  else query.mode = m
  router.replace({ query }) // also drops any #error=... left by an expired reset link
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

// Someone opening an invite link while already logged in joins straight away.
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

// Set a new password (?mode=reset). The email link logs them in for this one purpose; without
// that session (expired or already-used link) there's nothing to change, so explain instead.
const reset = reactive({
  status: 'checking', // 'checking' | 'ready' | 'invalid' | 'done'
  password: '',
  confirm: '',
  touched: { password: false, confirm: false },
  linkError: '',
})

// Supabase reports a bad link in the URL, e.g. #error_description=Email+link+is+invalid+or+has+expired
function linkErrorFromUrl() {
  const params = new URLSearchParams(window.location.hash.slice(1) || window.location.search)
  return params.get('error_description')?.replace(/\+/g, ' ') ?? ''
}

watch(
  () => [isReset.value, auth.ready],
  ([resetting, ready]) => {
    if (!resetting || !ready || reset.status === 'done') return
    reset.linkError = linkErrorFromUrl()
    reset.status = !hasSupabase || (auth.isLoggedIn && !reset.linkError) ? 'ready' : 'invalid'
  },
  { immediate: true },
)

const resetErrors = computed(() => ({
  password: !reset.password
    ? 'Enter a new password.'
    : reset.password.length < MIN_PASSWORD
      ? `Use at least ${MIN_PASSWORD} characters (${reset.password.length} so far).`
      : '',
  confirm: !reset.confirm
    ? 'Type the new password again.'
    : reset.confirm !== reset.password
      ? 'The two passwords don’t match.'
      : '',
}))

const resetShown = computed(() => ({
  password: reset.touched.password ? resetErrors.value.password : '',
  confirm: reset.touched.confirm ? resetErrors.value.confirm : '',
}))

async function submitNewPassword() {
  error.value = ''
  reset.touched.password = reset.touched.confirm = true
  const firstInvalid = ['password', 'confirm'].find((key) => resetErrors.value[key])
  if (firstInvalid) {
    await nextTick()
    document.getElementById(`reset-${firstInvalid}`)?.focus()
    return
  }

  busy.value = true
  try {
    await auth.updatePassword(reset.password)
    reset.status = 'done'
    reset.password = reset.confirm = ''
  } catch (e) {
    error.value = e.message || 'Could not change your password. Please try again.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="auth">
    <section class="form-side">
      <div v-if="isReset" class="auth-card">
        <h1 class="auth-card__title">Set a new password.</h1>

        <p v-if="reset.status === 'checking'" class="auth-card__sub" role="status">
          <span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
          Checking your reset link…
        </p>

        <template v-else-if="reset.status === 'invalid'">
          <p class="auth-card__sub">This reset link can’t be used.</p>
          <p class="alert alert-danger py-2 small" role="alert">
            {{ reset.linkError || 'The link is invalid, has expired or has already been used.' }}
          </p>
          <p class="auth-card__sub">
            Go back to log in, enter your email and press “Forgot password?” to get a new link.
          </p>
          <button type="button" class="btn btn-primary w-100 submit" @click="setMode('login')">
            Back to log in
          </button>
        </template>

        <template v-else-if="reset.status === 'done'">
          <p class="alert alert-success py-2 small" role="status">
            Your password has been changed. You’re logged in.
          </p>
          <RouterLink class="btn btn-primary w-100 submit" :to="{ name: 'dashboard' }">
            Go to My hangouts
          </RouterLink>
        </template>

        <form v-else novalidate @submit.prevent="submitNewPassword">
          <p class="auth-card__sub">
            <template v-if="auth.user?.email">For {{ auth.user.email }}. </template>
            Choose a password you haven’t used here before.
          </p>

          <div class="field">
            <label for="reset-password" class="form-label">New password</label>
            <div class="password">
              <input
                id="reset-password"
                v-model="reset.password"
                class="form-control"
                :class="{ 'is-invalid': resetShown.password }"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                :placeholder="`At least ${MIN_PASSWORD} characters`"
                required
                :minlength="MIN_PASSWORD"
                :aria-invalid="Boolean(resetShown.password)"
                aria-describedby="reset-password-help"
                @blur="reset.touched.password = true"
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
            <p v-if="resetShown.password" id="reset-password-help" class="field-error">
              {{ resetShown.password }}
            </p>
            <p
              v-else
              id="reset-password-help"
              class="field-hint"
              :class="{ 'field-hint--ok': reset.password.length >= MIN_PASSWORD }"
            >
              {{
                reset.password.length >= MIN_PASSWORD
                  ? '✓ Long enough'
                  : `At least ${MIN_PASSWORD} characters`
              }}
            </p>
          </div>

          <div class="field">
            <label for="reset-confirm" class="form-label">Confirm new password</label>
            <input
              id="reset-confirm"
              v-model="reset.confirm"
              class="form-control"
              :class="{ 'is-invalid': resetShown.confirm }"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              required
              :aria-invalid="Boolean(resetShown.confirm)"
              aria-describedby="reset-confirm-error"
              @blur="reset.touched.confirm = true"
            />
            <p v-if="resetShown.confirm" id="reset-confirm-error" class="field-error">
              {{ resetShown.confirm }}
            </p>
          </div>

          <p v-if="error" class="alert alert-danger py-2 small" role="alert">{{ error }}</p>

          <button type="submit" class="btn btn-primary w-100 submit" :disabled="busy">
            <span
              v-if="busy"
              class="spinner-border spinner-border-sm me-2"
              aria-hidden="true"
            ></span>
            {{ busy ? 'Saving…' : 'Save new password' }}
          </button>
        </form>
      </div>

      <div v-else class="auth-card">
        <p v-if="inviteCode" class="invite-note" role="status">
          You’ve been invited to a hangout. {{ isSignup ? 'Sign up' : 'Log in' }} to join it.
        </p>

        <h1 class="auth-card__title">{{ isSignup ? 'Create your account.' : 'Welcome back.' }}</h1>
        <p class="auth-card__sub">
          {{ isSignup ? 'Start planning fairer hangouts.' : 'Log in to see your hangouts.' }}
        </p>

        <div class="mode-switch" role="group" aria-label="Log in or sign up">
          <button
            type="button"
            :class="{ on: !isSignup }"
            :aria-pressed="!isSignup"
            @click="setMode('login')"
          >
            Log in
          </button>
          <button
            type="button"
            :class="{ on: isSignup }"
            :aria-pressed="isSignup"
            @click="setMode('signup')"
          >
            Sign up
          </button>
        </div>

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
  min-height: calc(100vh - 88px); /* fill the screen below the navbar */
  background: var(--fp-bg);
}

.form-side {
  display: flex;
  justify-content: center;
  padding: 5.5rem 1.5rem 7.5rem;
}

.auth-card {
  width: 100%;
  max-width: 472px;
}

.auth-card__title {
  margin: 0;
  font-size: clamp(3.25rem, 7vw, 5rem);
  line-height: 0.98;
  letter-spacing: -0.025em;
}

.auth-card__sub {
  margin: 0.9rem 0 0;
  color: var(--fp-muted);
  font-size: 1.2rem;
}

.invite-note {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0 0 2rem;
  padding: 0.75rem 1.1rem;
  border-radius: var(--fp-radius-pill);
  background: var(--fp-tint);
  color: var(--fp-primary-dark);
  font-size: 0.95rem;
  font-weight: 600;
}

/* Log in / Sign up: a grey track with the chosen side in black */
.mode-switch {
  display: flex;
  margin: 2.25rem 0 1.75rem;
  padding: 5px;
  background: var(--fp-surface);
  border-radius: var(--fp-radius-pill);
}

.mode-switch button {
  flex: 1;
  min-height: 46px;
  border: 0;
  border-radius: var(--fp-radius-pill);
  background: transparent;
  color: var(--fp-ink);
  font-weight: 700;
}

.mode-switch button.on {
  background: var(--fp-ink);
  color: var(--fp-bg);
}

@media (prefers-reduced-motion: no-preference) {
  .mode-switch button {
    transition:
      background-color 160ms var(--fp-ease),
      color 160ms var(--fp-ease);
  }
}

.field {
  margin-bottom: 1.1rem;
}

.form-label {
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
  font-weight: 600;
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
  min-height: 60px;
  margin-top: 0.5rem;
  font-size: 1.2rem;
}

.switch {
  margin: 1.75rem 0 0;
  color: var(--fp-muted);
  text-align: center;
}

@media (max-width: 575.98px) {
  .form-side {
    padding: 3rem 1rem 5rem;
  }
}
</style>
