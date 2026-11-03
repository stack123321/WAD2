// Which planning steps the current person has finished, so later pages can point them back
// to a missing one. A member who isn't found (e.g. a viewer) is never blocked.
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// `steps` limits which steps this page needs, in order; `missingStep` is the first one not done.
export function useHangoutPrerequisites(
  getHangout,
  steps = ['starting-points', 'transport', 'midpoint'],
) {
  const route = useRoute()
  const auth = useAuthStore()

  // In the demo hangout (sample people) you're Surya
  const myId = computed(() =>
    route.params.id !== 'demo' && !String(route.params.id).startsWith('demo') && auth.user
      ? auth.user.id
      : 'u-surya',
  )
  const me = computed(() => getHangout()?.members?.find((m) => m.user_id === myId.value))

  const hasStartingPoint = computed(
    () => !me.value || (me.value.start_lat != null && me.value.start_lng != null),
  )
  const hasTransport = computed(() => !me.value || !!me.value.mode)
  const hasMidpoint = computed(
    () => getHangout()?.midpoint_lat != null && getHangout()?.midpoint_lng != null,
  )

  const done = {
    'starting-points': hasStartingPoint,
    transport: hasTransport,
    midpoint: hasMidpoint,
  }
  const missingStep = computed(() =>
    getHangout() ? (steps.find((step) => !done[step].value) ?? null) : null,
  )

  return { missingStep }
}
