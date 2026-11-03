import { createApp } from 'vue'
import { createPinia } from 'pinia'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js' // navbar toggle, dropdowns, modals
import './styles/tokens.css'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// (Surya) a page file from an older version failed to load early (after a new deploy): reload
// to get the new version, instead of links silently doing nothing
window.addEventListener('vite:preloadError', () => {
  window.location.reload()
})

// Start listening for Supabase login/logout before the first page renders.
useAuthStore().init()

app.mount('#app')
