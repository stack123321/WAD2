// Owner: Eashvar. Plain helper functions for 11 Group voting and 12 Final plan.
// No Vue and no API calls, so they are easy to read and test on their own.

const SGT = 'Asia/Singapore'

/** Votes per spot, in shortlist order: [{ spot, count }] */
export function countVotes(shortlist, votes) {
  return shortlist.map((spot) => ({
    spot,
    count: votes.filter((v) => v.shortlist_id === spot.id).length,
  }))
}

// Most votes first. A tie goes to the spot that matches the group's preferences better.
function byVotesThenMatch(a, b) {
  return b.count - a.count || (b.spot.match_pct ?? 0) - (a.spot.match_pct ?? 0)
}

/** The spot with the most votes (tie → higher match_pct), or null if the shortlist is empty. */
export function pickLeader(rows) {
  return [...rows].sort(byVotesThenMatch)[0] ?? null
}

/** True when two or more spots share the top vote count (and it isn't zero). */
export function isTied(rows) {
  const ranked = [...rows].sort(byVotesThenMatch)
  return ranked.length > 1 && ranked[0].count > 0 && ranked[0].count === ranked[1].count
}

/** The best spot other than excludeId: the backup plan on 12. */
export function runnerUp(rows, excludeId) {
  return [...rows].sort(byVotesThenMatch).find((row) => row.spot.id !== excludeId) ?? null
}

/**
 * What changed between two lists of vote rows, as activity events.
 * Only shortlist_id is compared (not voted_at), so the same vote arriving twice
 * (once from my click, once from Realtime) doesn't show up twice.
 */
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

/** "9:30 pm" in Singapore time */
export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-SG', {
    timeZone: SGT,
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** "Fri, 16 Oct, 7:00 pm" in Singapore time */
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

/** True when both times fall on the same calendar day in Singapore. */
export function isSameSgtDay(isoA, isoB) {
  // en-CA formats dates as YYYY-MM-DD, which is easy to compare
  const day = (iso) => new Date(iso).toLocaleDateString('en-CA', { timeZone: SGT })
  return day(isoA) === day(isoB)
}

/** "2d 4h left", "3h 20m left", "45 min left", or null once the deadline has passed. */
export function timeLeft(deadlineIso, nowMs) {
  const ms = new Date(deadlineIso).getTime() - nowMs
  if (ms <= 0) return null
  const totalMins = Math.ceil(ms / 60000)
  const days = Math.floor(totalMins / 1440)
  const hours = Math.floor((totalMins % 1440) / 60)
  const mins = totalMins % 60
  if (days > 0) return `${days}d ${hours}h left`
  if (hours > 0) return `${hours}h ${mins}m left`
  return `${mins} min left`
}

/**
 * The longest and shortest trips and the gap between them: the numbers that show the plan is fair.
 * Members without a travel time yet are left out. Returns null if nobody has one.
 */
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

/** When to leave: starts_at minus the trip length. Returns an ISO string. */
export function leaveBy(startsAtIso, travelMins) {
  return new Date(new Date(startsAtIso).getTime() - travelMins * 60000).toISOString()
}

const MODE_LABELS = { mrt: 'MRT', bus: 'Bus', car: 'Car', walk: 'Walk' }

/** "mrt" → "MRT" */
export function modeLabel(mode) {
  return MODE_LABELS[mode] ?? '—'
}

/** 1.5 → "S$1.50" (Supabase returns numeric columns as strings, hence Number()) */
export function formatCost(cost) {
  return cost == null ? '—' : `S$${Number(cost).toFixed(2)}`
}

// Google Calendar wants UTC times written as 20261016T110000Z
function toCalendarTime(ms) {
  return new Date(ms)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
}

/**
 * A Google Calendar "add event" link. Our data has no end time, so the event
 * lasts `hours` (2 by default).
 */
export function calendarUrl({ title, startIso, location, details, hours = 2 }) {
  const start = new Date(startIso).getTime()
  const end = start + hours * 3600000
  // URLSearchParams escapes spaces, "&" and other characters for the URL
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
