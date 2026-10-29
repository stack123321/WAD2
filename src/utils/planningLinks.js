// Owner: Nicole. The buttons that take you back into planning from a hangout's chat (the chat
// page and My Chats), so you don't get stuck in the chats after e.g. Remind on 07.
// "Back" returns to the page you came from (?from= in the address); "Continue planning" goes to
// the step the hangout is up to, from Ryan's getStatus (the same page the dashboard opens).
import { getStatus } from './hangoutStatus'

// The hangout steps in order, to tell a step ahead from one behind
const STEPS = ['starting-points', 'transport', 'midpoint', 'explore', 'vote', 'final-plan', 'debrief']

// Pages allowed in ?from=, and what the back button says. Anything else is ignored, so a
// made-up ?from= can't send people somewhere odd
const BACK_LABELS = {
  'starting-points': 'Starting points',
  transport: 'Transport',
  // (Surya) the step bar's Chat button can be pressed on any step
  midpoint: 'Midpoint',
  explore: 'Spots',
  vote: 'Vote',
  'final-plan': 'Final plan',
  debrief: 'Debrief',
}

/**
 * @param {object} hangout the hangout with its members (as getHangout returns it)
 * @param {string | undefined} myId the logged-in user's id
 * @param {string | undefined} from the page that linked here (route.query.from)
 * @returns {{ back: { page: string, label: string } | null, next: { page: string } | null }}
 */
export function planningLinks(hangout, myId, from) {
  let back = null
  if (BACK_LABELS[from]) {
    back = { page: from, label: BACK_LABELS[from] }
  }

  // Only offer "Continue planning" when it leads somewhere new: not the page "Back" already
  // goes to, and not a step before it (e.g. Starting points when you came from Transport)
  const nextPage = getStatus(hangout, myId).page
  let next = { page: nextPage }
  if (back && STEPS.indexOf(nextPage) <= STEPS.indexOf(back.page)) {
    next = null
  }

  return { back: back, next: next }
}
