<script setup>
// Owner: Hugo (UI kit). Basic version so the app runs; restyle to match Figma.
// Ryan: top links and a profile menu from 768px, a bottom tab bar with a centre "+" below that.
import { computed, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

// the first letter of their name (or email) for the profile circle
const initial = computed(() => {
  if (!auth.user) return ''
  const name = auth.user.user_metadata?.display_name || auth.user.email || '?'
  return name.charAt(0).toUpperCase()
})

// leave room under the page for the tab bar while it is showing (the rule is in tokens.css)
watchEffect(() => {
  document.body.classList.toggle('has-tabbar', auth.isLoggedIn)
})

// Ask first, then log out and leave the app for the landing page
async function logOut() {
  const sure = window.confirm('Log out of Fairpoint?')
  if (!sure) {
    return
  }
  await auth.signOut()
  router.push({ name: 'landing' })
}
</script>

<template>
  <nav class="topbar bg-white border-bottom" aria-label="Main">
    <div class="container-fluid px-3 d-flex align-items-center gap-3 py-2">
      <RouterLink class="brand me-auto" :to="{ name: 'landing' }">Fairpoint</RouterLink>

      <template v-if="auth.isLoggedIn">
        <ul class="nav d-none d-md-flex align-items-center gap-1">
          <li class="nav-item">
            <RouterLink class="nav-link" :to="{ name: 'dashboard' }">Hangouts</RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink class="nav-link" :to="{ name: 'friends' }">Friends</RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink class="nav-link" :to="{ name: 'chats' }">Chats</RouterLink>
          </li>
          <li class="nav-item dropdown">
            <button
              type="button"
              class="btn profile-btn"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              aria-label="Your profile menu"
            >
              <span class="initial">{{ initial }}</span>
            </button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li>
                <RouterLink class="dropdown-item" :to="{ name: 'preferences' }">
                  Preferences
                </RouterLink>
              </li>
              <li><hr class="dropdown-divider" /></li>
              <li><button type="button" class="dropdown-item" @click="logOut">Log out</button></li>
            </ul>
          </li>
        </ul>
      </template>
      <RouterLink v-else class="btn btn-primary btn-sm" :to="{ name: 'auth' }">Log in</RouterLink>
    </div>
  </nav>

  <nav v-if="auth.isLoggedIn" class="tabbar d-md-none" aria-label="Tabs">
    <RouterLink class="tab" :to="{ name: 'dashboard' }">
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <rect x="4" y="5" width="16" height="15" rx="2.5" />
        <path d="M4 10h16M9 3v4M15 3v4" />
      </svg>
      Hangouts
    </RouterLink>
    <RouterLink class="tab" :to="{ name: 'friends' }">
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="9" cy="9" r="3.2" />
        <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
        <circle cx="17" cy="10" r="2.5" />
        <path d="M16.5 14.5A4.5 4.5 0 0 1 21 19" />
      </svg>
      Friends
    </RouterLink>
    <RouterLink class="tab plus" :to="{ name: 'create-hangout' }" aria-label="Start planning">
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.4"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    </RouterLink>
    <RouterLink class="tab" :to="{ name: 'chats' }">
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path
          d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4A2.5 2.5 0 0 1 4 13.5z"
        />
      </svg>
      Chats
    </RouterLink>
    <div class="dropdown dropup tab-wrap">
      <button type="button" class="tab" data-bs-toggle="dropdown" aria-expanded="false">
        <span class="initial small-initial">{{ initial }}</span>
        Profile
      </button>
      <ul class="dropdown-menu dropdown-menu-end">
        <li>
          <RouterLink class="dropdown-item" :to="{ name: 'preferences' }">Preferences</RouterLink>
        </li>
        <li><hr class="dropdown-divider" /></li>
        <li><button type="button" class="dropdown-item" @click="logOut">Log out</button></li>
      </ul>
    </div>
  </nav>
</template>

<style scoped>
.brand {
  font-weight: 800;
  font-size: 1.2rem;
  color: var(--fp-primary);
  text-decoration: none;
}

.nav-link {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
}

.nav-link.router-link-active {
  color: var(--fp-primary);
  font-weight: 700;
}

.initial {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--fp-primary);
  color: var(--fp-surface);
  font-weight: 700;
}

.profile-btn {
  min-height: 44px;
  padding: 0 0.375rem;
}

/* bottom tab bar, phones and small tablets */
.tabbar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1030;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  align-items: end;
  padding: 0.375rem 0.25rem calc(0.5rem + env(safe-area-inset-bottom, 0px));
  background: var(--fp-surface);
  border-top: 1px solid var(--fp-border);
}

.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 52px;
  border: 0;
  background: transparent;
  color: var(--fp-muted);
  font-size: 0.7rem;
  font-weight: 600;
  text-decoration: none;
}

.tab.router-link-active {
  color: var(--fp-primary);
}

.tab.plus {
  align-self: center;
  justify-self: center;
  width: 52px;
  height: 52px;
  min-height: 52px;
  margin-top: -14px;
  border-radius: 16px;
  background: var(--fp-primary);
  color: var(--fp-surface);
  box-shadow: var(--fp-shadow);
}

.tab-wrap {
  display: flex;
  justify-content: center;
}

.small-initial {
  width: 24px;
  height: 24px;
  font-size: 0.7rem;
}
</style>
