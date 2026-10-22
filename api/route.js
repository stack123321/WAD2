// Owner: Nicole. Vercel serverless function: GET /api/route?fromLat=&fromLng=&toLat=&toLng=&mode=
// OneMap Routing needs a token (from ONEMAP_EMAIL / ONEMAP_PASSWORD), so the call happens here
// on the server instead of in the browser. Docs: https://www.onemap.gov.sg/apidocs/routing
//
// Replies with { mins, cost, steps: [{ instruction, mins }] }. Used by 07 Mode of transport and 08 Midpoint.
import axios from 'axios'
import { sampleRoute, MODE_NAMES } from './_mocks/route.js'
import { getOneMapToken, hasOneMapLogin } from './_onemap.js'
import { averageParking } from './_parking.js'

const ROUTE_URL = 'https://www.onemap.gov.sg/api/public/routingsvc/route'

// Answers we already got from OneMap, so reloading page 07 or a friend changing their mode
// doesn't ask for the same routes again (faster, and fewer calls to OneMap)
const savedRoutes = new Map()

export default async function handler(req, res) {
  const from = { lat: Number(req.query.fromLat), lng: Number(req.query.fromLng) }
  const to = { lat: Number(req.query.toLat), lng: Number(req.query.toLng) }
  const mode = req.query.mode

  if ([from.lat, from.lng, to.lat, to.lng].some(Number.isNaN) || !MODE_NAMES.includes(mode)) {
    return res
      .status(400)
      .json({ error: `Need fromLat, fromLng, toLat, toLng and mode (${MODE_NAMES.join(' / ')})` })
  }

  // No OneMap login in .env.local → sample data, so teammates without keys can still work
  if (!hasOneMapLogin()) {
    return res.json(sampleRoute(from, to, mode))
  }

  // Asked for this exact trip before? Reply with the saved answer instead of asking OneMap again
  const key = `${from.lat},${from.lng} ${to.lat},${to.lng} ${mode} ${todayInSingapore()}`
  if (savedRoutes.has(key)) {
    return res.json(savedRoutes.get(key))
  }

  try {
    const token = await getOneMapToken()
    let route
    if (mode === 'walk' || mode === 'car') {
      route = await walkOrDrive(from, to, mode, token)
    } else {
      route = await publicTransport(from, to, mode, token)
    }
    savedRoutes.set(key, route)
    return res.json(route)
  } catch (error) {
    // e.g. OneMap is down or found no route. Page 07 needs a time for everyone to rank the
    // stations, so fall back to the estimate instead of failing
    console.error('[api/route]', error.message)
    return res.json(sampleRoute(from, to, mode))
  }
}

// Walking and driving: OneMap gives the total time (seconds) and distance (metres)
async function walkOrDrive(from, to, mode, token) {
  let routeType = 'walk'
  if (mode === 'car') {
    routeType = 'drive'
  }

  const response = await askOneMap(
    { start: `${from.lat},${from.lng}`, end: `${to.lat},${to.lng}`, routeType: routeType },
    token,
  )

  const summary = response.data.route_summary
  const mins = toMins(summary.total_time)
  const km = summary.total_distance / 1000

  let cost = 0
  let instruction = `Walk ${km.toFixed(1)} km`
  if (mode === 'car') {
    // For driving, the cost is parking per hour, not petrol (the card says "$1.07/h parking"):
    // the malls near the meeting point, or the usual HDB / URA $1.20 (see _parking.js)
    cost = await averageParking(to)
    instruction = `Drive ${km.toFixed(1)} km`
  }

  return { mins: mins, cost: cost, steps: [{ instruction: instruction, mins: mins }] }
}

// MRT and bus: OneMap's public transport routing, limited to trains (RAIL) or buses (BUS).
// It needs a date and time because trains and buses run on a timetable; we ask for today at
// 6 pm, a typical time to meet, so the answer doesn't change with the time you open the page.
async function publicTransport(from, to, mode, token) {
  let ptMode = 'RAIL'
  let vehicle = 'SUBWAY' // what OneMap calls an MRT ride in the trip's legs
  if (mode === 'bus') {
    ptMode = 'BUS'
    vehicle = 'BUS'
  }

  const response = await askOneMap(
    {
      start: `${from.lat},${from.lng}`,
      end: `${to.lat},${to.lng}`,
      routeType: 'pt',
      mode: ptMode,
      date: todayInSingapore(),
      time: '18:00:00',
      maxWalkDistance: 1000,
      numItineraries: 3,
    },
    token,
  )

  // For short trips OneMap's best answer is often "just walk", even when you picked bus or MRT.
  // So we ask for 3 options and take the first that really rides a bus / train. If none does,
  // the place is too close for one, and we keep the walk.
  const options = response.data.plan.itineraries
  let trip = options[0]
  for (const option of options) {
    const rides = option.legs.find((leg) => leg.mode === vehicle)
    if (rides) {
      trip = option
      break
    }
  }
  const walkOnly = trip.legs.every((leg) => leg.mode === 'WALK')

  // one step per part of the trip, e.g. "Walk to TAMPINES MRT STATION", "MRT (EW) to ..."
  const steps = []
  for (const leg of trip.legs) {
    let instruction = `Walk to ${leg.to.name}`
    if (leg.mode === 'SUBWAY') {
      instruction = `MRT (${leg.route}) from ${leg.from.name} to ${leg.to.name}`
    } else if (leg.mode === 'BUS') {
      instruction = `Bus ${leg.route} from ${leg.from.name} to ${leg.to.name}`
    }
    steps.push({ instruction: instruction, mins: toMins(leg.duration) })
  }
  if (walkOnly) {
    steps[0].instruction += ` (it's close, so no ${mode === 'bus' ? 'bus' : 'MRT'} needed)`
  }

  // fare is a string like "1.90". Walking is free; when OneMap writes "info unavailable"
  // instead of a price, use our estimate so the card doesn't say $0 for a bus ride
  let cost = Number(trip.fare)
  if (walkOnly) {
    cost = 0
  } else if (Number.isNaN(cost)) {
    cost = sampleRoute(from, to, mode).cost
  }

  return { mins: toMins(trip.duration), cost: cost, steps: steps }
}

// Page 07 asks for about 32 routes at once (8 stations × each person), and OneMap turns some
// away with 429 "Too Many Requests". When that happens, wait a little and try again.
async function askOneMap(params, token) {
  const MAX_TRIES = 6
  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    try {
      return await axios.get(ROUTE_URL, { params: params, headers: { Authorization: token } })
    } catch (error) {
      const tooMany = error.response && error.response.status === 429
      if (!tooMany || attempt === MAX_TRIES) {
        throw error
      }
      // wait longer each time (about 1 s, 2 s, 3 s...), plus a random bit so the calls
      // that were turned away together don't all come back at the same moment
      await wait(attempt * 1000 + Math.random() * 1000)
    }
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// OneMap gives seconds; we show whole minutes (at least 1)
function toMins(seconds) {
  return Math.max(1, Math.round(seconds / 60))
}

// OneMap wants the date as MM-DD-YYYY, in Singapore time (the server may be in another time zone)
function todayInSingapore() {
  const date = new Date().toLocaleDateString('en-US', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return date.replaceAll('/', '-')
}
