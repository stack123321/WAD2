// Owner: Eashvar. What the three fanned cards on the landing page show for someone who's logged in:
// their next hangout (or, if none is coming up, the last one), worked out from the same data as
// 11 and 12. Each card says only what's true for that hangout; where a step isn't done yet it says
// what's still needed, never sample people. Used by components/landing/HeroCards.vue.
// Travel times aren't saved with a hangout (08 works them out live), so fillTravelTimes() does the
// same here before the cards are built.
import {
  countableVotes,
  countVotes,
  formatTime,
  leaveBy,
  modeLabel,
  pickLeader,
  timeLeft,
  tripRange,
} from '@/components/voting/voteHelpers'
import { travelTo } from '@/services/routing'
import { avatarColor } from '@/utils/avatarColor'
import { sgDate } from '@/utils/dates'

const SGT = 'Asia/Singapore'
const MAX_TRIP_ROWS = 4
const ROUTE_TIMEOUT_MS = 8000

/**
 * A copy of the hangout with each person's travel time worked out, like 08 does: OneMap routes
 * (via /api/route) from their start, by their own mode, to the chosen spot or else the midpoint.
 * Only for people with a start and a mode who don't have a time yet; anyone else is left as they
 * are. If the routes fail or take too long, the hangout comes back without the times.
 */
export async function fillTravelTimes(h, timeoutMs = ROUTE_TIMEOUT_MS) {
  const spot = (h.shortlist ?? []).find((s) => s.id === h.final_shortlist_id)
  const dest =
    spot?.lat != null
      ? { lat: spot.lat, lng: spot.lng }
      : h.midpoint_lat != null
        ? { lat: h.midpoint_lat, lng: h.midpoint_lng }
        : null
  const need = (h.members ?? []).filter(
    (m) => m.travel_mins == null && m.mode && m.start_lat != null && m.start_lng != null,
  )
  if (!dest || need.length === 0) return h

  const copy = JSON.parse(JSON.stringify(h))
  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('routes took too long')), timeoutMs),
    )
    const { travelMins } = await Promise.race([travelTo(need, dest), timeout])
    need.forEach((m, i) => {
      copy.members.find((c) => c.user_id === m.user_id).travel_mins = travelMins[i]
    })
  } catch (err) {
    console.warn('Hero cards: no travel times', err)
  }
  return copy
}

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

// "Fri 16 Oct" and "Fri 16 Oct, 7 pm" ("Today" when it's today)
function dayLabel(iso, now) {
  if (now && sgDate(new Date(iso)) === sgDate(now)) return 'Today'
  return new Date(iso)
    .toLocaleDateString('en-SG', {
      timeZone: SGT,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
    .replace(',', '')
}

function whenLabel(iso, now) {
  const time = new Date(iso)
    .toLocaleTimeString('en-SG', { timeZone: SGT, hour: 'numeric', minute: '2-digit' })
    .replace(':00', '')
  return `${dayLabel(iso, now)}, ${time}`
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
 *   times: 'leave' (when each person leaves, or their trip if there's no date yet) |
 *          'starts' (nobody has a travel time yet: where each person is starting from)
 * Anyone not ready yet is listed after the others, saying what they still need to do, so a
 * half-filled group never looks final.
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
      // the gap is only between the trips worked out so far
      soFar: timed.length < members.length ? `${timed.length} of ${members.length} so far` : null,
    }
  } else {
    const missing = members.filter((m) => m.start_lat == null)
    trips = {
      kind: 'starts',
      added: members.length - missing.length,
      total: members.length,
      missing: missing.map(person),
      missingText: missing.length
        ? `Waiting on ${nameList(missing.map(nameOf))}`
        : members.some((m) => !m.mode)
          ? 'Everyone’s in. Next: pick how you’re travelling'
          : 'Everyone’s in. Travel times couldn’t load just now',
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

  // "2 of 4 voted · closes in 23h 0m", while the vote is open
  let voteStatus = null
  if (h.status === 'voting') {
    const left = h.vote_deadline ? timeLeft(h.vote_deadline, now.getTime()) : null
    voteStatus = [`${votes.length} of ${members.length} voted`, left ? `closes in ${left}` : null]
      .filter(Boolean)
      .join(' · ')
  }

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
      when: h.starts_at ? whenLabel(h.starts_at, now) : null,
      leave: when === 'past' ? null : myLeave,
      status: voteStatus,
    }
  } else {
    spot = {
      kind: 'plan',
      label: h.name,
      when: h.starts_at ? whenLabel(h.starts_at, now) : 'No date yet',
      midpoint: h.midpoint_name ? `Meeting near ${h.midpoint_name}` : 'Finding the fair midpoint',
      leave: myLeave,
    }
  }

  // ---- right: when everyone leaves ----
  const ready = members.filter((m) => m.travel_mins != null)
  const notReady = members.filter((m) => m.travel_mins == null)
  // what someone who isn't ready still has to do
  const pending = (m) => ({
    ...person(m),
    ready: false,
    time: null,
    detail: m.start_lat == null ? 'No start added yet' : 'Picking transport',
  })

  let times
  if (ready.length > 0) {
    const withTime = ready.map((m) => ({
      ...person(m),
      ready: true,
      sortKey: h.starts_at
        ? new Date(leaveBy(h.starts_at, m.travel_mins)).getTime()
        : m.travel_mins,
      // with a date: the time to leave; without one: just the trip
      time: h.starts_at ? formatTime(leaveBy(h.starts_at, m.travel_mins)) : `${m.travel_mins} min`,
      detail: `${modeLabel(m.mode)} · ${m.travel_mins} min`,
    }))
    // earliest to leave first (or longest trip first), then whoever isn't ready yet
    withTime.sort((a, b) => (h.starts_at ? a.sortKey - b.sortKey : b.sortKey - a.sortKey))
    const all = [...withTime, ...notReady.map(pending)]
    let note
    if (!h.starts_at) note = 'Leave-by times show once there’s a date'
    else if (notReady.length) {
      note = `${ready.length} of ${members.length} ready · times update as people add theirs`
    } else note = when === 'past' ? null : 'Everyone’s set'
    times = {
      kind: 'leave',
      title: !h.starts_at
        ? 'Everyone’s trip'
        : when === 'past'
          ? 'When everyone left'
          : 'When everyone leaves',
      // sortKey was only for the order, so it's left off the rows
      rows: all.slice(0, MAX_TRIP_ROWS).map(({ sortKey: _sortKey, ...row }) => row),
      more: Math.max(0, all.length - MAX_TRIP_ROWS),
      note,
    }
  } else {
    // nobody has a travel time yet: where everyone is coming from so far
    const all = [
      ...members
        .filter((m) => m.start_lat != null)
        .map((m) => ({
          ...person(m),
          ready: true,
          time: null,
          detail: m.start_label ?? 'Added',
        })),
      ...members
        .filter((m) => m.start_lat == null)
        .map((m) => ({
          ...person(m),
          ready: false,
          time: null,
          detail: 'Not added yet',
        })),
    ]
    times = {
      kind: 'starts',
      title: 'Where everyone’s starting',
      rows: all.slice(0, MAX_TRIP_ROWS),
      more: Math.max(0, all.length - MAX_TRIP_ROWS),
      note: 'Leave-by times show once everyone picks how they’re travelling',
    }
  }

  // ---- one sentence for screen readers ----
  const said = [`${when === 'past' ? 'Your last hangout' : 'Your next hangout'}, ${h.name}`]
  if (trips.kind === 'trips') said.push(`everyone’s trip is within ${trips.gap} minutes`)
  else said.push(`${trips.added} of ${trips.total} starting points added`)
  if (spot.kind === 'spot') said.push(`${spot.label.toLowerCase()}: ${spot.name}`)
  if (voteStatus) said.push(voteStatus)
  if (times.kind === 'leave' && notReady.length) {
    said.push(`${ready.length} of ${members.length} have a travel time`)
  }

  return {
    when,
    label: when === 'past' ? 'Last time' : 'Up next',
    date: h.starts_at ? dayLabel(h.starts_at, now) : null,
    name: h.name,
    link: { name: stepFor(h, when), params: { id: h.id } },
    trips,
    spot,
    times,
    summary: said.join('; ') + '.',
  }
}
