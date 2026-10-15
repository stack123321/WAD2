<script setup>
// Owner: Hugo (UI kit). Basic version so the app runs; restyle to match Figma.
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

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
  <nav class="navbar navbar-expand-sm bg-white border-bottom">
    <div class="container">
      <RouterLink class="navbar-brand brand" :to="{ name: 'landing' }">Fairpoint</RouterLink>
      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#mainNav"
        aria-controls="mainNav"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>
      <div id="mainNav" class="collapse navbar-collapse">
        <ul class="navbar-nav ms-auto align-items-sm-center gap-sm-2">
          <li v-if="auth.isLoggedIn" class="nav-item">
            <RouterLink class="nav-link" :to="{ name: 'dashboard' }">My hangouts</RouterLink>
          </li>
          <li v-if="auth.isLoggedIn" class="nav-item">
            <RouterLink class="nav-link" :to="{ name: 'preferences' }">Preferences</RouterLink>
          </li>
          <li class="nav-item">
            <button v-if="auth.isLoggedIn" class="btn btn-outline-primary btn-sm" @click="logOut">
              Log out
            </button>
            <RouterLink v-else class="btn btn-primary btn-sm" :to="{ name: 'auth' }"
              >Log in</RouterLink
            >
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.brand {
  font-weight: 800;
  color: var(--fp-primary);
}

.nav-link.router-link-active {
  color: var(--fp-primary);
  font-weight: 600;
}
</style>
