<script setup>
// Owner: Hugo (UI kit). The top bar on every page: the "fairpoint" wordmark, links to your
// hangouts, groups and preferences (the current one underlined in teal), your initial (tap it to
// log out) and the teal "New hangout" pill. Logged out it shows "How it works" and a teal "Log in"
// pill. On phones the links fold into a menu behind the round black button.
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

// The first letter of your name (or email) for the round account button
const initial = computed(() => {
  const name = auth.user?.user_metadata?.display_name || auth.user?.email || '?'
  return name.charAt(0).toUpperCase()
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
  <nav class="navbar navbar-expand-md fp-nav">
    <div class="nav-inner">
      <RouterLink class="navbar-brand wordmark" :to="{ name: 'landing' }">fairpoint</RouterLink>

      <template v-if="auth.isLoggedIn">
        <div class="nav-end order-md-last">
          <button type="button" class="avatar-btn" title="Log out" @click="logOut">
            <span aria-hidden="true">{{ initial }}</span>
            <span class="visually-hidden">Log out</span>
          </button>
          <RouterLink
            class="btn btn-brand d-none d-lg-inline-flex"
            :to="{ name: 'create-hangout' }"
          >
            New hangout
          </RouterLink>
          <button
            class="navbar-toggler menu-btn"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#mainNav"
            aria-controls="mainNav"
            aria-expanded="false"
            aria-label="Open menu"
          >
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 8h16M4 16h16"
                stroke="currentColor"
                stroke-width="2.2"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
        <div id="mainNav" class="collapse navbar-collapse">
          <ul class="navbar-nav mx-md-auto">
            <li class="nav-item">
              <RouterLink class="nav-link" :to="{ name: 'dashboard' }">My hangouts</RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink class="nav-link" :to="{ name: 'groups' }">Groups</RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink class="nav-link" :to="{ name: 'preferences' }">Preferences</RouterLink>
            </li>
            <li class="nav-item d-lg-none">
              <RouterLink class="nav-link" :to="{ name: 'create-hangout' }">New hangout</RouterLink>
            </li>
          </ul>
        </div>
      </template>

      <div v-else class="nav-end">
        <RouterLink
          class="how-link d-none d-sm-inline-flex"
          :to="{ name: 'landing', hash: '#how-it-works' }"
        >
          How it works
        </RouterLink>
        <RouterLink class="btn btn-brand" :to="{ name: 'auth' }">Log in</RouterLink>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.fp-nav {
  background: var(--fp-bg);
  border-bottom: 1px solid var(--fp-border);
  padding: 0.75rem 0;
  min-height: 88px;
}

.nav-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  max-width: 1360px;
  margin: 0 auto;
  padding-inline: clamp(1rem, 2.8vw, 2.5rem);
}

.wordmark {
  margin: 0;
  color: var(--fp-primary);
  font-family: var(--fp-display);
  font-weight: 900;
  font-size: 2.125rem;
  letter-spacing: -0.02em;
  line-height: 1;
}

.wordmark:hover {
  color: var(--fp-primary-dark);
}

.nav-end {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.navbar-nav {
  gap: 0.25rem 2.75rem;
}

.nav-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0.6rem 0 !important;
  border-bottom: 2px solid transparent;
  color: var(--fp-ink);
  font-size: 1.125rem;
  font-weight: 500;
  white-space: nowrap;
}

.nav-link:hover {
  color: var(--fp-primary-dark);
}

.nav-link.router-link-active {
  color: var(--fp-primary);
  border-bottom-color: var(--fp-primary);
  font-weight: 700;
}

.avatar-btn {
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: var(--fp-pill);
  color: var(--fp-ink);
  font-weight: 700;
}

.avatar-btn:hover {
  background: var(--fp-pill-hover);
}

.how-link {
  align-items: center;
  min-height: 44px;
  padding: 0 1.1rem;
  color: var(--fp-ink);
  font-weight: 600;
  text-decoration: none;
}

.menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--fp-ink);
  color: var(--fp-bg);
}

.menu-btn:focus {
  box-shadow: var(--fp-focus);
}

/* Phones: 64px bar, smaller wordmark, links stack in the menu */
@media (max-width: 767.98px) {
  .fp-nav {
    min-height: 64px;
    padding: 0.6rem 0;
  }

  .wordmark {
    font-size: 1.75rem;
  }

  .navbar-nav {
    padding: 0.75rem 0 0.25rem;
    gap: 0;
  }

  .nav-link {
    border-bottom: 0;
  }
}

@media (min-width: 768px) and (max-width: 991.98px) {
  .navbar-nav {
    gap: 0.25rem 1.4rem;
  }

  .nav-link {
    font-size: 1rem;
  }
}
</style>
