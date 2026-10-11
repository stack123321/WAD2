// Owner: Ryan. All 12 pages are registered here, so page owners never need to touch this file.
// Numbers match the Figma frames (01–12).
import { createRouter, createWebHistory } from 'vue-router'
import LandingView from '@/views/LandingView.vue'
import { supabase, hasSupabase } from '@/services/supabase'

const routes = [
  // Before a hangout exists
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
    path: '/hangouts/new',
    name: 'create-hangout',
    component: () => import('@/views/CreateHangoutView.vue'),
    meta: { requiresAuth: true },
  }, // 05 Matrix

  // Inside one hangout (:id is the hangout's uuid; use "demo" to load src/mocks/hangout.json)
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

  // Unknown URLs go back to the landing page
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

// Login guard: pages with meta.requiresAuth need someone logged in, otherwise go to /login and
// come back afterwards (AuthView reads ?redirect=). Only runs with Supabase keys: without them,
// login is pretend and forgotten on refresh, so every page stays open for demos and tests.
router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth || !hasSupabase) return true

  // Ask Supabase directly: on a fresh page load the auth store may not know yet
  const { data } = await supabase.auth.getSession()
  if (data.session) return true
  return { name: 'auth', query: { redirect: to.fullPath } }
})

export default router
