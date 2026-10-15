// Owner: Eashvar. Plain helper functions (no Vue, no API calls) for 11 Group voting and
// 12 Final plan: keeping one vote per current member (their latest; votes from people who left
// the hangout don't count), counting votes and picking the leader (ties go to the higher
// match_pct), turning vote changes into activity events, Singapore-time formatting, the deadline
// countdown, the deadline to use when the host starts the vote (the saved one if it's still ahead,
// otherwise the hangout's start time, otherwise none), the longest/shortest trip and gap, leave-by
// times, and the Google Calendar link.

const SGT = 'Asia/Singapore'

export function deadlineForStart(voteDeadlineIso, startsAtIso, nowMs) {
  if (voteDeadlineIso && new Date(voteDeadlineIso).getTime() > nowMs) return voteDeadlineIso
  if (startsAtIso && new Date(startsAtIso).getTime() > nowMs) return startsAtIso
  return null
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

export function formatCost(cost) {
  return cost == null ? '—' : `S$${Number(cost).toFixed(2)}`
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
