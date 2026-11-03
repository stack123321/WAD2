// Owner: Matrix. How well a place fits the group's preferences, as a 0–100 match %.
// Used by 09 Nearby spots (SpotCard) and 10 Spot details. Pure function: no API calls — the
// caller resolves live data (rain forecast, group midpoint, hangout time) and passes it in via
// `context` so this stays fast and testable.
import vibeTypes from '@/mocks/vibes.json'
import activityTypes from '@/mocks/activityTypes.json'
import outdoorTypes from '@/mocks/outdoors.json'

// The hangouts table only stores a start time (starts_at), not a duration, so assume a typical
// 2-hour hangout when the caller doesn't say otherwise.
const DEFAULT_DURATION_MINS = 120
// Unranked place types fall back to this rank in the vote-history component (spec: rank 20).
const DEFAULT_RANK = 20
// Same walking assumptions as api/_mocks/route.js's "walk" mode: 5 km/h, 25% detour over a
// straight line.
const WALK_KMH = 5
const WALK_DETOUR = 1.25
const MINUTES_PER_WEEK = 7 * 24 * 60

/** Straight-line distance in km between two { lat, lng } points. */
function distanceKm(a, b) {
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

/** Minutes since the start of the week (Sun 00:00) in Singapore time, regardless of host timezone. */
function sgWeekMinutes(date) {
  const sg = new Date(date.getTime() + 8 * 60 * 60 * 1000) // Vercel/browsers may run in UTC
  return sg.getUTCDay() * 1440 + sg.getUTCHours() * 60 + sg.getUTCMinutes()
}

/** Google opening-hours periods → [{ start, duration }] in week-minutes, wrapping past Sunday. */
function weekRanges(periods) {
  return periods
    .filter((p) => p.open && p.close)
    .map((p) => {
      const start = p.open.day * 1440 + p.open.hour * 60 + p.open.minute
      const close = p.close.day * 1440 + p.close.hour * 60 + p.close.minute
      const duration = close > start ? close - start : close - start + MINUTES_PER_WEEK
      return { start, duration }
    })
}

/** Minutes until the range covering `weekMin` closes, or null when nothing is open at that time. */
function minsUntilClose(ranges, weekMin) {
  for (const { start, duration } of ranges) {
    let diff = weekMin - start
    if (diff < 0) diff += MINUTES_PER_WEEK
    if (diff < duration) return duration - diff
  }
  return null
}

/** Whether any of a place's Google types or broad category fits a hangout vibe. */
export function matchesHangoutVibe(place, vibes = []) {
  if (vibes.length === 0) return true

  const types = Array.isArray(place.types) ? place.types : []
  const placeTypes = [...types, place.primaryType].filter(Boolean)

  return vibes.some((vibe) => {
    if (place.category === vibe) return true
    const acceptedTypes = vibeTypes[vibe] ?? []
    return placeTypes.some((type) => acceptedTypes.includes(type))
  })
}

/** Whether a place is open for the whole [startAt, endAt] window, sampled every 15 minutes. */
function isOpenThroughout(openingHours, startAt, endAt) {
  const periods = openingHours?.periods
  if (!periods?.length) return true // unknown hours: don't veto on a guess
  if (periods.some((p) => p.open && !p.close)) return true // open 24 hours
  const ranges = weekRanges(periods)
  const STEP_MS = 15 * 60 * 1000
  for (let t = startAt.getTime(); t <= endAt.getTime(); t += STEP_MS) {
    if (minsUntilClose(ranges, sgWeekMinutes(new Date(t))) === null) return false
  }
  return true
}

/** Whether the place is scheduled to close within `withinMins` of `at`. */
function closesSoon(openingHours, at, withinMins) {
  const periods = openingHours?.periods
  if (!periods?.length || periods.some((p) => p.open && !p.close)) return false
  const left = minsUntilClose(weekRanges(periods), sgWeekMinutes(at))
  return left !== null && left <= withinMins
}

/**
 * The full breakdown behind a match %, shared by matchScore() (09 Nearby spots' badge) and
 * matchReasons() (10 Spot details' "Criteria" list), so both always agree with each other.
 * @param {object} place a spot shaped like src/services/places.js's toSpot(): category, types,
 *   priceLevel, lat, lng, openingHours ({ periods } | null), wheelchairAccessible (boolean | null)
 * @param {Array<object>} profiles members' preference rows from the profiles table (activities,
 *   budget, max_travel_mins, indoor_if_rain, avoid_crowds, step_free, vote_history)
 * @param {object} [context] live/group conditions
 * @param {string[]} [context.vibes] the hangout's vibe tags, e.g. hangout.vibe
 * @param {string|Date} [context.startAt] hangout start, e.g. hangout.starts_at
 * @param {string|Date} [context.endAt] hangout end; defaults to startAt + 2 hours
 * @param {boolean} [context.raining] rain forecast for the hangout window near the midpoint
 * @param {{ lat: number, lng: number }} [context.midpoint] group midpoint, for the walking penalty
 */
function evaluate(place, profiles = [], context = {}) {
  const types = place.types ?? []
  // Google's primaryType is the most accurate signal; types[0] and category are fallbacks for
  // sample/mock places that don't have it.
  const primaryType = place.primaryType ?? types[0] ?? place.category ?? null
  const vibes = context.vibes ?? []
  const startAt = context.startAt ? new Date(context.startAt) : null
  const endAt = startAt
    ? context.endAt
      ? new Date(context.endAt)
      : new Date(startAt.getTime() + DEFAULT_DURATION_MINS * 60 * 1000)
    : null
  const y = profiles.length || 1

  // ── 1. Hard vetoes ──
  if (startAt && endAt && !isOpenThroughout(place.openingHours, startAt, endAt)) {
    return { score: 0, vetoReason: "Closed during your hangout's time" }
  }
  if (profiles.some((p) => p.step_free) && place.wheelchairAccessible === false) {
    return {
      score: 0,
      vetoReason: 'Not step-free accessible for a group member',
    }
  }
  const isOutdoor = types.some((t) => outdoorTypes.includes(t))
  if (isOutdoor && context.raining && profiles.some((p) => p.indoor_if_rain)) {
    return {
      score: 0,
      vetoReason:
        "Outdoors, but rain is forecast",
    }
  }

  // ── 2. Base component score ──
  // A. Hangout vibe match (34%)
  const vibeMatch = matchesHangoutVibe(place, vibes)
  const scoreA = vibeMatch ? 34 : 0

  // B. User preference overlap (17%)
  const preferenceMatches = profiles.filter((p) =>
    (p.activities ?? []).some((activity) =>
      (activityTypes[activity] ?? []).some((t) => types.includes(t)),
    ),
  ).length
  const scoreB = (preferenceMatches / y) * 17

  // C. Historical vote-ranking match (16%)
  const ranks = profiles.map((p) => {
    if (!primaryType) return DEFAULT_RANK
    const sorted = Object.entries(p.vote_history ?? {}).sort((a, b) => b[1] - a[1])
    const idx = sorted.findIndex(([t]) => t === primaryType)
    return idx === -1 ? DEFAULT_RANK : idx + 1
  })
  let rankTotal = 0
  for (const r of ranks) {
    rankTotal += r
  }
  const avgRank = rankTotal / (ranks.length || 1)
  const rankStep = Math.floor(avgRank / 5)
  const scoreC = Math.max(0, (1 - 0.1 * rankStep) * 16)

  // D. Budget alignment (33%) — unknown price levels and budgets don't penalise either side
  const withinBudget = profiles.filter((p) => {
    if (place.priceLevel == null) return true
    return (p.budget ?? 2) >= place.priceLevel
  }).length
  const scoreD = (withinBudget / y) * 33

  // E. Dietary fit is only scored when the place advertises a matching signal. Unknown
  // dietary information stays neutral rather than penalising every place.
  const placeText = [place.name, place.category, ...(place.types ?? []), ...(place.tags ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  const dietaryMatches = profiles.filter((p) => {
    const needs = p.dietary ?? []
    if (needs.length === 0) return true
    return needs.some((need) => placeText.includes(String(need).toLowerCase()))
  }).length
  const dietaryKnown =
    profiles.some((p) => (p.dietary ?? []).length > 0) &&
    /(halal|vegetarian|vegan|kosher|gluten[- ]free)/.test(placeText)
  const scoreE = dietaryKnown ? (dietaryMatches / y) * 5 : 0

  const base = scoreA + scoreB + scoreC + scoreD + scoreE

  // ── 3. Soft veto multipliers ──
  let walkingMultiplier = 1
  let walkMins = null
  if (context.midpoint && place.lat != null && place.lng != null) {
    const km = distanceKm(context.midpoint, place) * WALK_DETOUR
    walkMins = Math.round((km / WALK_KMH) * 60)
    const b = Math.floor(walkMins / 7)
    walkingMultiplier = Math.max(0.2, 1 - 0.1 * b)
  }
  const closingSoon = Boolean(
    (startAt && closesSoon(place.openingHours, startAt, 60)) ||
      (endAt && closesSoon(place.openingHours, endAt, 60)),
  )
  const closingMultiplier = closingSoon ? 0.5 : 1
  const travelLimitMembers = profiles.filter(
    (p) => p.max_travel_mins != null && p.travel_mins != null,
  )
  const withinTravelLimit = travelLimitMembers.filter(
    (p) => p.travel_mins <= p.max_travel_mins,
  ).length
  const travelMultiplier =
    travelLimitMembers.length > 0 ? 0.7 + 0.3 * (withinTravelLimit / travelLimitMembers.length) : 1
  const crowdLevel = place.crowdLevel ?? context.crowdLevel
  const crowdMultiplier =
    profiles.some((p) => p.avoid_crowds) && (crowdLevel === 'h' || crowdLevel >= 2) ? 0.7 : 1

  // ── 4. Final score ──
  const final = base * walkingMultiplier * closingMultiplier * travelMultiplier * crowdMultiplier
  const score = Math.min(100, Math.max(0, Math.round(final)))

  return {
    score,
    vetoReason: null,
    vibes,
    vibeMatch,
    preference: { matches: preferenceMatches, of: y },
    voteHistory: { avgRank, rankStep },
    budget: { matches: withinBudget, of: y },
    dietary: { matches: dietaryMatches, of: y, known: dietaryKnown },
    travel: { within: withinTravelLimit, of: travelLimitMembers.length },
    crowd: { level: crowdLevel, multiplier: crowdMultiplier },
    walkMins,
    walkingMultiplier,
    closingSoon,
    travelMultiplier,
  }
}

/**
 * How well a place fits the group, as a 0–100 match %. See evaluate() for the parameters.
 * @returns {number} 0–100
 */
export function matchScore(place, profiles = [], context = {}) {
  return evaluate(place, profiles, context).score
}

/** The hard-veto explanation, or null when a zero score came from normal scoring. */
export function hardVetoReason(place, profiles = [], context = {}) {
  return evaluate(place, profiles, context).vetoReason
}

/** Explanations for soft penalties that reduce a place's score without forcing it to 0%. */
export function softVetoReasons(place, profiles = [], context = {}) {
  const result = evaluate(place, profiles, context)
  if (result.vetoReason) return []

  const reasons = []
  // no minutes here: the spot card already shows its walk time
  if (result.walkMins !== null && result.walkingMultiplier < 1) {
    reasons.push(result.walkingMultiplier >= 0.7 ? 'A bit of a walk' : 'Long walk')
  }
  if (result.closingSoon) {
    reasons.push('Closes within an hour of your hangout starting')
  }
  return reasons
}

/**
 * Plain-English reasons behind a place's match %, for 10 Spot details' "Criteria" section.
 * Ordered roughly biggest-impact first; `tone` says whether each one helped, hurt, or was
 * neutral, so the UI can colour them (e.g. green/amber/red).
 * @returns {Array<{ tone: 'good' | 'warn' | 'bad' | 'neutral', text: string }>}
 */
export function matchReasons(place, profiles = [], context = {}) {
  const result = evaluate(place, profiles, context)
  if (result.vetoReason) {
    return [{ tone: 'bad', text: result.vetoReason }]
  }

  const reasons = []
  const y = profiles.length || 1

  // A. Vibe
  if (result.vibes.length === 0) {
    reasons.push({ tone: 'neutral', text: "No vibe set for this hangout, so this didn't count for or against it" })
  } else if (result.vibeMatch) {
    reasons.push({ tone: 'good', text: `Matches your hangout's "${result.vibes.join(', ')}" vibe` })
  } else {
    reasons.push({ tone: 'bad', text: `Doesn't match your hangout's "${result.vibes.join(', ')}" vibe` })
  }

  // B. Preference overlap
  const { matches: prefMatches } = result.preference
  if (prefMatches === y) {
    reasons.push({ tone: 'good', text: 'Everyone in the group listed this as a preferred activity' })
  } else if (prefMatches === 0) {
    reasons.push({ tone: 'bad', text: "No one in the group listed this as a preferred activity" })
  } else {
    reasons.push({ tone: 'warn', text: `${prefMatches} of ${y} members listed this as a preferred activity` })
  }

  // C. Vote history
  const { rankStep } = result.voteHistory
  if (rankStep === 0) {
    reasons.push({ tone: 'good', text: 'The group has often voted for this kind of place before' })
  } else if (rankStep >= 4) {
    reasons.push({ tone: 'bad', text: "The group has rarely or never voted for this kind of place before" })
  } else {
    reasons.push({ tone: 'warn', text: 'The group has sometimes voted for this kind of place before' })
  }

  // D. Budget
  const { matches: budgetMatches } = result.budget
  if (budgetMatches === y) {
    reasons.push({ tone: 'good', text: 'Within budget for everyone in the group' })
  } else if (budgetMatches === 0) {
    reasons.push({ tone: 'bad', text: 'Over budget for everyone in the group' })
  } else {
    reasons.push({ tone: 'warn', text: `Within budget for ${budgetMatches} of ${y} members` })
  }

  if (result.dietary.known) {
    const { matches: dietaryMatches } = result.dietary
    if (dietaryMatches === y) {
      reasons.push({ tone: 'good', text: 'Dietary needs are catered for' })
    } else {
      reasons.push({ tone: 'warn', text: `Dietary needs are catered for ${dietaryMatches} of ${y} members` })
    }
  }
  if (result.travel.of > 0 && result.travel.within < result.travel.of) {
    reasons.push({ tone: 'warn', text: `${result.travel.within} of ${result.travel.of} members are within their travel limit` })
  }
  if (result.crowd.multiplier < 1) {
    reasons.push({ tone: 'warn', text: 'Usually busy, which may not suit members avoiding crowds' })
  }

  // Soft penalties, only mentioned when they actually bite
  if (result.walkMins !== null) {
    if (result.walkingMultiplier >= 1) {
      reasons.push({ tone: 'good', text: `Short walk from the group's midpoint (~${result.walkMins} min)` })
    } else if (result.walkingMultiplier >= 0.7) {
      reasons.push({ tone: 'warn', text: `A bit of a walk from the group's midpoint (~${result.walkMins} min)` })
    } else {
      reasons.push({ tone: 'bad', text: `Far from the group's midpoint (~${result.walkMins} min walk)` })
    }
  }
  if (result.closingSoon) {
    reasons.push({ tone: 'bad', text: 'Closes within an hour of the start or end of your hangout' })
  }

  return reasons
}
