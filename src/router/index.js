// Owner: Ryan
// all 12 pages are registered here, numbers match the figma frames (01–12)
import { watch } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { hasSupabase } from '@/services/supabase'
import LandingView from '@/views/LandingView.vue'

const routes = [
  // before a hangout exists
  { path: '/', name: 'landing', component: LandingView }, // 01 Matrix
  { path: '/login', name: 'auth', component: () => import('@/views/AuthView.vue') }, // 02 Matrix
  {
    path: '/preferences',
    name: 'preferences',
    component: () => import('@/views/PreferencesView.vue'),
    meta: { requiresAuth: true },
  }, // 03 Matrix
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { requiresAuth: true },
  }, // 04 Ryan
  {
    path: '/crowds',
    name: 'crowds',
    component: () => import('@/views/CrowdsView.vue'),
    meta: { requiresAuth: true },
  }, // Ryan: full crowd heat map, no link to it yet
  {
    path: '/friends',
    name: 'friends',
    component: () => import('@/views/FriendsView.vue'),
    meta: { requiresAuth: true },
  }, // Ryan: friends list, from the navbar
  {
    path: '/chats',
    name: 'chats',
    component: () => import('@/views/MyChatsView.vue'),
    meta: { requiresAuth: true },
  }, // Ryan: my chats, one row per hangout
  {
    path: '/chats/:hangoutId',
    name: 'chat',
    component: () => import('@/views/ChatView.vue'),
    meta: { requiresAuth: true },
  }, // Ryan: one hangout's chat
  {
    path: '/chats/direct/:chatId',
    name: 'direct-chat',
    component: () => import('@/views/DirectChatView.vue'),
    meta: { requiresAuth: true },
  }, // Ryan: one to one chat with a friend
  {
    path: '/hangouts/new',
    name: 'create-hangout',
    component: () => import('@/views/CreateHangoutView.vue'),
    meta: { requiresAuth: true },
  }, // 05 Matrix

  // inside one hangout (:id is the hangout's uuid, "demo" loads src/mocks/hangout.json)
  {
    path: '/hangouts/:id/start',
    name: 'starting-points',
    component: () => import('@/views/StartingPointsView.vue'),
    meta: { requiresAuth: true },
  }, // 06 Surya
  {
    path: '/hangouts/:id/transport',
    name: 'transport',
    component: () => import('@/views/TransportView.vue'),
    meta: { requiresAuth: true },
  }, // 07 Nicole
  {
    path: '/hangouts/:id/midpoint',
    name: 'midpoint',
    component: () => import('@/views/MidpointView.vue'),
    meta: { requiresAuth: true },
  }, // 08 Ryan + Surya
  {
    path: '/hangouts/:id/explore',
    name: 'explore',
    component: () => import('@/views/ExploreView.vue'),
    meta: { requiresAuth: true },
  }, // 09 Hugo
  {
    path: '/hangouts/:id/spots/:spotId',
    name: 'spot-details',
    component: () => import('@/views/SpotDetailsView.vue'),
    meta: { requiresAuth: true },
  }, // 10 Hugo
  {
    path: '/hangouts/:id/vote',
    name: 'vote',
    component: () => import('@/views/VoteView.vue'),
    meta: { requiresAuth: true },
  }, // 11 Eashvar
  {
    path: '/hangouts/:id/plan',
    name: 'final-plan',
    component: () => import('@/views/FinalPlanView.vue'),
    meta: { requiresAuth: true },
  }, // 12 Eashvar
  {
    path: '/hangouts/:id/debrief',
    name: 'debrief',
    component: () => import('@/views/DebriefView.vue'),
    meta: { requiresAuth: true },
  }, // Eashvar: looking back on a past hangout, from 04's Past tab and 12 once it's done

  // unknown urls go back to the landing page
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

// login guard for pages with meta.requiresAuth: logged-out users go to /login and come back afterwards, only when supabase is connected (mock mode and e2e tests leave every page open)
router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth || !hasSupabase) {
    return
  }

  const auth = useAuthStore()

  // wait for supabase to restore the session after a refresh, otherwise a logged-in user gets sent to login by mistake
  if (!auth.ready) {
    await new Promise((resolve) => {
      const stop = watch(
        () => auth.ready,
        (ready) => {
          if (ready) {
            stop()
            resolve()
          }
        },
      )
    })
  }

  if (!auth.isLoggedIn) {
    return { name: 'auth', query: { redirect: to.fullPath } }
  }
})

export default router
