// Owner: Eashvar. What the three fanned cards on the landing page show for someone who's logged in:
// their next hangout (or, if none is coming up, the last one), worked out from the same data as
// 11 and 12. Each card says only what's true for that hangout; where a step isn't done yet it says
// what's still needed, never sample people. Used by components/landing/HeroCards.vue.
import {
  countableVotes,
  countVotes,
  formatTime,
  leaveBy,
  pickLeader,
  runnerUp,
  timeLeft,
  tripRange,
} from '@/components/voting/voteHelpers'
import { avatarColor } from '@/utils/avatarColor'
import { sgDate } from '@/utils/dates'

const SGT = 'Asia/Singapore'
const MAX_TRIP_ROWS = 4

/**
 * The hangout to show: the soonest one that isn't over, or else the most recent past one that was
 * decided (a past hangout nobody settled has nothing worth showing). Past = marked done, or its
 * date is before today (the same rule as 04 My hangouts).
 * @returns {{ hangout: object, when: 'upcoming' | 'past' } | null}
 */
export function pickHeroHangout(hangouts, now = new Date()) {
  const today = sgDate(now)
  const isPast = (h) =>
    h.status === 'done' || (h.starts_at && sgDate(new Date(h.starts_at)) < today)
  const time = (h) => (h.starts_at ? new Date(h.starts_at).getTime() : Infinity)

  const upcoming = hangouts.filter((h) => !isPast(h)).sort((a, b) => time(a) - time(b))
  if (upcoming.length > 0) return { hangout: upcoming[0], when: 'upcoming' }

  const decided = (h) => h.status === 'done' || Boolean(h.final_shortlist_id)
  const past = hangouts.filter((h) => isPast(h) && decided(h)).sort((a, b) => time(b) - time(a))
  if (past.length > 0) return { hangout: past[0], when: 'past' }
  return null
}

// "Fri 16 Oct" and "Fri 16 Oct, 7 pm"
function dayLabel(iso) {
  return new Date(iso)
    .toLocaleDateString('en-SG', {
      timeZone: SGT,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
    .replace(',', '')
}

function whenLabel(iso) {
  const time = new Date(iso)
    .toLocaleTimeString('en-SG', { timeZone: SGT, hour: 'numeric', minute: '2-digit' })
    .replace(':00', '')
  return `${dayLabel(iso)}, ${time}`
}

// "Nicole", "Nicole and Hugo", "Nicole, Hugo and Surya"
function nameList(names) {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

// where clicking the cards goes: the step the hangout is on
function stepFor(h, when) {
  if (when === 'past' || h.status === 'done') return 'debrief'
  if (h.status === 'confirmed') return 'final-plan'
  if (h.status === 'voting') return 'vote'
  return h.midpoint_lat ? 'explore' : 'starting-points'
}

/**
 * The three cards for one hangout, from the point of view of myId.
 * Each card has a `kind` saying which version to draw:
 *   trips: 'trips' (everyone's trip and the gap) | 'starts' (who still needs to add a start)
 *   spot:  'spot' (confirmed, picked or leading) | 'plan' (no spot yet: name, date, midpoint)
 *   vote:  'tally' (the votes) | 'next' (no vote yet: the shortlist and what's next)
 */
export function buildHeroCards(h, myId, when, now = new Date()) {
  const members = h.members ?? []
  const shortlist = h.shortlist ?? []
  const me = members.find((m) => m.user_id === myId) ?? null
  const nameOf = (m) => (m.user_id === myId ? 'You' : m.display_name)
  const person = (m) => ({
    id: m.user_id,
    name: nameOf(m),
    initial: (m.display_name || '?').charAt(0).toUpperCase(),
    color: avatarColor(m.avatar_color, m.display_name),
  })

  // ---- left: fair for everyone ----
  let trips
  const timed = members.filter((m) => m.travel_mins != null)
  if (timed.length >= 2) {
    const range = tripRange(members)
    // you first, then everyone else in the order they joined
    const ordered = [...timed.filter((m) => m === me), ...timed.filter((m) => m !== me)]
    trips = {
      kind: 'trips',
      gap: range.gap,
      rows: ordered.slice(0, MAX_TRIP_ROWS).map((m) => ({
        ...person(m),
        mins: m.travel_mins,
        width: Math.round((m.travel_mins / range.longest) * 100),
        longest: range.gap > 0 && m.travel_mins === range.longest,
      })),
      more: Math.max(0, ordered.length - MAX_TRIP_ROWS),
    }
  } else {
    const missing = members.filter((m) => m.start_lat == null)
    trips = {
      kind: 'starts',
      added: members.length - missing.length,
      total: members.length,
      missing: missing.map(person),
      missingText: missing.length ? `Waiting on ${nameList(missing.map(nameOf))}` : '',
    }
  }

  // ---- middle: the spot ----
  const votes = countableVotes(h.votes ?? [], members)
  const rows = countVotes(shortlist, votes)
  const confirmed = shortlist.find((s) => s.id === h.final_shortlist_id) ?? null
  const leader = pickLeader(rows)
  const chosen = confirmed ?? (h.status === 'voting' && leader?.count > 0 ? leader.spot : null)
  const myLeave =
    me?.travel_mins != null && h.starts_at ? formatTime(leaveBy(h.starts_at, me.travel_mins)) : null

  let spot
  if (chosen) {
    let label = 'Leading, not confirmed'
    if (confirmed) label = when === 'past' ? 'Where you went' : 'Confirmed spot'
    spot = {
      kind: 'spot',
      label,
      name: chosen.name,
      details: [
        chosen.category
          ? chosen.category.charAt(0).toUpperCase() + chosen.category.slice(1).replace('_', ' ')
          : null,
        chosen.rating ? `rated ${chosen.rating}` : null,
        h.midpoint_name,
      ]
        .filter(Boolean)
        .join(' · '),
      when: h.starts_at ? whenLabel(h.starts_at) : null,
      leave: when === 'past' ? null : myLeave,
    }
  } else {
    spot = {
      kind: 'plan',
      label: h.name,
      when: h.starts_at ? whenLabel(h.starts_at) : 'No date yet',
      midpoint: h.midpoint_name ? `Meeting near ${h.midpoint_name}` : 'Finding the fair midpoint',
      leave: myLeave,
    }
  }

  // ---- right: the vote ----
  let vote
  const totalVotes = votes.length
  if (shortlist.length > 0 && (h.status === 'voting' || confirmed)) {
    const ranked = [...rows].sort((a, b) => b.count - a.count)
    const voted = new Set(votes.map((v) => v.user_id))
    const waiting = members.filter((m) => !voted.has(m.user_id)).map(nameOf)
    let footer
    if (h.status === 'voting') {
      const left = h.vote_deadline ? timeLeft(h.vote_deadline, now.getTime()) : null
      const parts = [left ? `Closes in ${left}` : null]
      if (waiting.length) parts.push(`waiting on ${nameList(waiting)}`)
      footer = parts.filter(Boolean).join(' · ') || `${totalVotes} of ${members.length} voted`
    } else {
      const second = runnerUp(rows, confirmed.id)
      footer = second
        ? `Runner-up: ${second.spot.name}`
        : `${totalVotes} of ${members.length} voted`
    }
    vote = {
      kind: 'tally',
      title: h.status === 'voting' ? 'Group voting' : 'How you decided',
      rows: ranked.slice(0, 2).map((r) => ({
        id: r.spot.id,
        name: r.spot.name,
        count: r.count,
        width: totalVotes ? Math.round((r.count / totalVotes) * 100) : 0,
        picked: confirmed ? r.spot.id === confirmed.id : false,
      })),
      footer,
    }
  } else {
    let next
    if (trips.kind === 'starts' && trips.missing.length)
      next = 'Everyone adds where they’re starting'
    else if (!h.midpoint_name) next = 'Pick how you’re travelling, then find the midpoint'
    else if (shortlist.length === 0) next = `Add up to 3 spots near ${h.midpoint_name}`
    else next = 'Start the vote when everyone’s added their spots'
    vote = {
      kind: 'next',
      title: 'Shortlist',
      count: shortlist.length,
      next,
    }
  }

  // ---- one sentence for screen readers ----
  const said = [`${when === 'past' ? 'Your last hangout' : 'Your next hangout'}, ${h.name}`]
  if (trips.kind === 'trips') said.push(`everyone’s trip is within ${trips.gap} minutes`)
  else said.push(`${trips.added} of ${trips.total} starting points added`)
  if (spot.kind === 'spot') said.push(`${spot.label.toLowerCase()}: ${spot.name}`)
  if (vote.kind === 'tally' && h.status === 'voting')
    said.push(`${totalVotes} of ${members.length} have voted`)

  return {
    when,
    label: when === 'past' ? 'Last time' : 'Up next',
    date: h.starts_at ? dayLabel(h.starts_at) : null,
    name: h.name,
    link: { name: stepFor(h, when), params: { id: h.id } },
    trips,
    spot,
    vote,
    summary: said.join('; ') + '.',
  }
}
