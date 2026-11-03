import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

export function useHangoutPrerequisites(getHangout) {
  const route = useRoute()
  const auth = useAuthStore()

  const currentMember = computed(() => {
    const hangout = getHangout()
    if (!hangout) return null

    const hangoutId = String(route.params.id ?? '')
    const userId = hangoutId.startsWith('demo') || !auth.user ? 'u-surya' : auth.user.id
    return hangout.members.find((member) => member.user_id === userId) ?? null
  })

  const hasStartingPoint = computed(() => {
    const member = currentMember.value
    return !member || (member.start_lat != null && member.start_lng != null)
  })
  const hasTransport = computed(() => !currentMember.value || Boolean(currentMember.value.mode))
  const hasMidpoint = computed(() => {
    const hangout = getHangout()
    return hangout?.midpoint_lat != null && hangout?.midpoint_lng != null
  })

  return { hasStartingPoint, hasTransport, hasMidpoint }
}
