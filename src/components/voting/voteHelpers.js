// Owner: Eashvar. Plain helper functions (no Vue, no API calls) for 11 Group voting and
// 12 Final plan: keeping one vote per current member (their latest; votes from people who left
// the hangout don't count), counting votes and ranking them (equal counts are listed by higher
// match_pct), the spots tied for the most votes (for the tie-break wheel), turning vote changes
// into activity events, Singapore-time formatting, the deadline
// countdown, the choices for when voting closes (picked by the host when they start the vote on 11,
// since 05 no longer sets it), the longest/shortest trip and gap, leave-by times, costs (driving
// is hourly parking), and the Google Calendar link.

const SGT = 'Asia/Singapore'

const CLOSE_CHOICES = [
  { hoursBefore: 24, label: '1 day before the hangout' },
  { hoursBefore: 6, label: '6 hours before the hangout' },
  { hoursBefore: 2, label: '2 hours before the hangout' },
  { hoursBefore: 1, label: '1 hour before the hangout' },
  { hoursBefore: 0, label: 'When the hangout starts' },
]

// When voting can close, for the host's "Voting closes" menu: only times still at least 15 minutes
// away, earliest first. A deadline already saved on the hangout is offered first if still ahead.
export function closeOptions(voteDeadlineIso, startsAtIso, nowMs) {
  const soonest = nowMs + 15 * 60 * 1000
  const options = []
  if (voteDeadlineIso && new Date(voteDeadlineIso).getTime() > soonest) {
    options.push({ iso: voteDeadlineIso, label: 'As planned when the hangout was made' })
  }
  if (!startsAtIso) return options
  const start = new Date(startsAtIso).getTime()
  for (const choice of CLOSE_CHOICES) {
    const at = start - choice.hoursBefore * 3600 * 1000
    if (at > soonest) options.push({ iso: new Date(at).toISOString(), label: choice.label })
  }
  return options
}

// The choice selected to begin with: 2 hours before if it's still possible, otherwise the latest
export function defaultCloseOption(options) {
  if (options.length === 0) return null
  const twoHours = options.find((o) => o.label === '2 hours before the hangout')
  return (twoHours ?? options[options.length - 1]).iso
}

export function countableVotes(votes, members) {
  const latest = {}
  for (const vote of votes) {
    if (!members.some((m) => m.user_id === vote.user_id)) continue
    const kept = latest[vote.user_id]
    if (!kept || new Date(vote.voted_at) > new Date(kept.voted_at)) latest[vote.user_id] = vote
  }
  return Object.values(latest)
}

export function countVotes(shortlist, votes) {
  return shortlist.map((spot) => ({
    spot,
    count: votes.filter((v) => v.shortlist_id === spot.id).length,
  }))
}

function byVotesThenMatch(a, b) {
  return b.count - a.count || (b.spot.match_pct ?? 0) - (a.spot.match_pct ?? 0)
}

export function pickLeader(rows) {
  return [...rows].sort(byVotesThenMatch)[0] ?? null
}

export function isTied(rows) {
  const ranked = [...rows].sort(byVotesThenMatch)
  return ranked.length > 1 && ranked[0].count > 0 && ranked[0].count === ranked[1].count
}

export function tiedLeaders(rows) {
  if (!isTied(rows)) return []
  const top = Math.max(...rows.map((row) => row.count))
  return rows.filter((row) => row.count === top).map((row) => row.spot)
}

export function runnerUp(rows, excludeId) {
  return [...rows].sort(byVotesThenMatch).find((row) => row.spot.id !== excludeId) ?? null
}

export function diffVotes(before, after, nowIso) {
  const events = []
  for (const vote of after) {
    const old = before.find((v) => v.user_id === vote.user_id)
    if (!old) {
      events.push({
        kind: 'voted',
        userId: vote.user_id,
        toId: vote.shortlist_id,
        fromId: null,
        at: vote.voted_at,
      })
    } else if (old.shortlist_id !== vote.shortlist_id) {
      events.push({
        kind: 'changed',
        userId: vote.user_id,
        toId: vote.shortlist_id,
        fromId: old.shortlist_id,
        at: vote.voted_at,
      })
    }
  }
  for (const old of before) {
    if (!after.some((v) => v.user_id === old.user_id)) {
      events.push({
        kind: 'removed',
        userId: old.user_id,
        toId: null,
        fromId: old.shortlist_id,
        at: nowIso,
      })
    }
  }
  return events
}

export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-SG', {
    timeZone: SGT,
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatDateTime(iso) {
  return new Date(iso).toLocaleString('en-SG', {
    timeZone: SGT,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function isSameSgtDay(isoA, isoB) {
  const day = (iso) => new Date(iso).toLocaleDateString('en-CA', { timeZone: SGT })
  return day(isoA) === day(isoB)
}

export function timeLeft(deadlineIso, nowMs) {
  const ms = new Date(deadlineIso).getTime() - nowMs
  if (ms <= 0) return null
  const totalMins = Math.ceil(ms / 60000)
  const days = Math.floor(totalMins / 1440)
  const hours = Math.floor((totalMins % 1440) / 60)
  const mins = totalMins % 60
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins} min`
}

export function tripRange(members) {
  const timed = members.filter((m) => m.travel_mins != null)
  if (timed.length === 0) return null
  const mins = timed.map((m) => m.travel_mins)
  const longest = Math.max(...mins)
  const shortest = Math.min(...mins)
  return {
    longest,
    shortest,
    gap: longest - shortest,
    longestNames: timed.filter((m) => m.travel_mins === longest).map((m) => m.display_name),
    shortestNames: timed.filter((m) => m.travel_mins === shortest).map((m) => m.display_name),
  }
}

export function leaveBy(startsAtIso, travelMins) {
  return new Date(new Date(startsAtIso).getTime() - travelMins * 60000).toISOString()
}

const MODE_LABELS = { mrt: 'MRT', bus: 'Bus', car: 'Car', walk: 'Walk' }

export function modeLabel(mode) {
  return MODE_LABELS[mode] ?? '—'
}

// "S$1.79", or for driving the hourly parking rate (what 07 saves for a car): "S$1.20/h parking"
export function formatCost(cost, mode) {
  if (cost == null) return '—'
  const amount = `S$${Number(cost).toFixed(2)}`
  return mode === 'car' ? `${amount}/h parking` : amount
}

function toCalendarTime(ms) {
  return new Date(ms)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
}

export function calendarUrl({ title, startIso, location, details, hours = 2 }) {
  const start = new Date(startIso).getTime()
  const end = start + hours * 3600000
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${toCalendarTime(start)}/${toCalendarTime(end)}`,
    location,
    details,
    ctz: SGT,
  })
  return `https://calendar.google.com/calendar/render?${params}`
}
