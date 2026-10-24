// Owner: Eashvar. Vercel serverless function behind the Ask box on 09 Nearby spots:
//   POST /api/assistant  { message, history, midpoint: { name, lat, lng }, startsAt, needs }
//   needs = { size, dietary: ['halal'], maxPrice: 1-3 | null } (from groupNeeds() on the page)
// 1. Gemini turns the message into a search ("prata for dinner, one of us is halal" → "halal prata")
// 2. Google Places Text Search finds real places within that walk of the meeting point
// 3. Our own code keeps the ones open at the hangout's time and within budget, groups first
// Replies with { reply, query, places (same shape as /api/places), suggestOtherStations, sample }.
// The keys stay here on the server (GEMINI_API_KEY, GOOGLE_PLACES_API_KEY in .env.local / Vercel).
import { toSearch } from './_gemini.js'
import { textSearch } from './_google.js'
import { sampleReply } from './_mocks/assistant.js'

const MAX_MESSAGE = 300
const MAX_RESULTS = 5
const FEW_RESULTS = 3 // fewer than this and the page offers other stations
const WALK_M_PER_MIN = 80

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' })

  const input = readInput(req.body ?? {})
  if (input.error) return res.status(400).json({ error: input.error })

  const geminiKey = process.env.GEMINI_API_KEY
  const placesKey = process.env.GOOGLE_PLACES_API_KEY
  // No keys in .env.local → sample spots, so teammates without keys can still work
  if (!geminiKey || !placesKey) return res.json(sampleReply(input.message, input.midpoint))

  let search
  try {
    search = await toSearch(geminiKey, input)
  } catch (err) {
    const busy = err.response?.status === 429
    return res.status(busy ? 429 : 502).json({
      error: busy
        ? 'The assistant is busy right now. Try again in a minute.'
        : `Couldn't understand that right now (${err.message})`,
    })
  }

  if (!search.isSearch || !search.query?.trim()) {
    return res.json({ reply: search.reply, query: null, places: [], suggestOtherStations: false })
  }

  const walkMins = clamp(search.walkMins || 10, 4, 25)
  const radiusM = walkMins * WALK_M_PER_MIN
  let found
  try {
    found = await textSearch(placesKey, input.midpoint, radiusM, search.query.trim())
  } catch (err) {
    return res.status(502).json({ error: `Couldn't search for places right now (${err.message})` })
  }

  const places = pickForGroup(found, {
    startsAt: input.startsAt,
    maxPrice: search.maxPrice || input.needs.maxPrice,
    preferGroups: search.needsGroup || input.needs.size >= 4,
  }).slice(0, MAX_RESULTS)

  return res.json({
    reply: summarise(places.length, { query: search.query.trim(), walkMins, ...input }),
    query: search.query.trim(),
    places,
    suggestOtherStations: places.length < FEW_RESULTS,
  })
}

// Check and tidy what the page sent; anything odd is dropped rather than passed to Gemini
function readInput(body) {
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) return { error: 'Type what you are looking for' }
  if (message.length > MAX_MESSAGE) return { error: `Keep it under ${MAX_MESSAGE} characters` }

  const m = body.midpoint ?? {}
  const midpoint = {
    name: String(m.name ?? 'the midpoint').slice(0, 60),
    lat: Number(m.lat),
    lng: Number(m.lng),
  }
  if (!Number.isFinite(midpoint.lat) || !Number.isFinite(midpoint.lng)) {
    return { error: 'This hangout needs a midpoint first' }
  }

  const history = (Array.isArray(body.history) ? body.history : [])
    .filter((h) => (h?.role === 'user' || h?.role === 'model') && typeof h.text === 'string')
    .slice(-4)
    .map((h) => ({ role: h.role, text: h.text.slice(0, 600) }))

  const n = body.needs ?? {}
  const needs = {
    size: clamp(Number(n.size) || 1, 1, 50),
    dietary: (Array.isArray(n.dietary) ? n.dietary : [])
      .filter((d) => typeof d === 'string')
      .map((d) => d.slice(0, 20))
      .slice(0, 5),
    maxPrice: [1, 2, 3, 4].includes(n.maxPrice) ? n.maxPrice : null,
  }

  const startsAt = body.startsAt && !Number.isNaN(Date.parse(body.startsAt)) ? body.startsAt : null
  return { message, midpoint, history, needs, startsAt }
}

// Open at the hangout's time and within budget (unknown hours or price count as fine), then
// places good for groups first when the group is big, then nearest
function pickForGroup(places, { startsAt, maxPrice, preferGroups }) {
  const isGroupFriendly = (p) => p.tags.includes('Good for groups')
  return places
    .filter((p) => !startsAt || isOpenAt(p.opening_hours?.periods, startsAt) !== false)
    .filter((p) => !maxPrice || p.price_level == null || p.price_level <= maxPrice)
    .sort((a, b) => {
      if (preferGroups && isGroupFriendly(a) !== isGroupFriendly(b))
        return isGroupFriendly(a) ? -1 : 1
      return a.distance_m - b.distance_m
    })
}

/**
 * Whether Google's opening-hours periods cover the first hour from startsAt (Singapore time).
 * null when the hours are unknown.
 */
function isOpenAt(periods, startsAt, forMins = 60) {
  if (!periods?.length) return null
  if (periods.some((p) => p.open && !p.close)) return true // open 24 hours
  const WEEK = 7 * 24 * 60
  const sg = new Date(new Date(startsAt).getTime() + 8 * 60 * 60 * 1000)
  const at = sg.getUTCDay() * 1440 + sg.getUTCHours() * 60 + sg.getUTCMinutes()
  const toMins = (t) => t.day * 1440 + (t.hour ?? 0) * 60 + (t.minute ?? 0)
  return periods.some((p) => {
    const start = toMins(p.open)
    let end = toMins(p.close)
    if (end <= start) end += WEEK // closes after midnight on Saturday
    return [at, at + WEEK].some((t) => t >= start && t + forMins <= end)
  })
}

function summarise(count, { query, walkMins, midpoint, startsAt }) {
  const time = startsAt
    ? new Intl.DateTimeFormat('en-SG', {
        timeZone: 'Asia/Singapore',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(startsAt))
    : null
  const where = `within a ${walkMins} min walk of ${midpoint.name}`
  if (count === 0) {
    return `Couldn't find "${query}" ${where}${time ? ` that's open at ${time}` : ''}. Try something else, or another station.`
  }
  const found = `Found ${count} ${count === 1 ? 'spot' : 'spots'} for "${query}" ${where}${time ? `, open at ${time}` : ''}.`
  return count < FEW_RESULTS
    ? `${found} Not many here, so another station might suit you better.`
    : found
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, Math.round(n)))
}
