// Owner: Nicole. Parking rate per hour around a meeting point, used for the car cost in
// route.js. Finds the car parks within 500 m (LTA DataMall): the malls' average rate from
// _data/carparkRates.js, or the standard HDB / URA $1.20/h when there's no mall. Not an endpoint.
// Docs: https://datamall.lta.gov.sg/content/datamall/en/dynamic-data.html
import axios from 'axios'
import { CARPARK_RATES } from './_data/carparkRates.js'
import { distanceKm } from './_mocks/geo.js'

const CARPARKS_URL = 'https://datamall2.mytransport.sg/ltaodataservice/CarParkAvailabilityv2'
const STANDARD_RATE = 1.2 // HDB / URA car parks: $0.60 per half hour
const NEARBY_KM = 0.5
const ONE_DAY = 24 * 60 * 60 * 1000

// Car parks don't move, so download the full list once a day
let savedCarparks = null
let savedAt = 0

async function getCarparks() {
  if (savedCarparks && Date.now() - savedAt < ONE_DAY) {
    return savedCarparks
  }
  const all = []
  let skip = 0
  // LTA sends 500 car parks at a time, so keep asking until a page comes back short
  while (true) {
    const response = await axios.get(CARPARKS_URL, {
      headers: { AccountKey: process.env.LTA_ACCOUNT_KEY },
      params: { $skip: skip },
    })
    const page = response.data.value
    all.push(...page)
    if (page.length < 500) break
    skip += 500
  }
  savedCarparks = all
  savedAt = Date.now()
  return all
}

// A mall from the 2018 list, matching names loosely ("VivoCity P3" → "vivocity").
// Returns its name in the list too, so the mall's other car parks (P2, P3...) count once
function findMall(name) {
  const lower = name.toLowerCase()
  for (const [mall, rate] of Object.entries(CARPARK_RATES)) {
    if (lower.includes(mall) || mall.includes(lower)) return { mall: mall, rate: rate }
  }
  return null
}

/**
 * Dollars per hour to park near a point. Someone driving to meet friends usually parks at the
 * mall by the MRT, not a residential HDB car park, so it's the average rate of the malls within
 * 500 m; with no mall nearby, the HDB / URA rate. Falls back to $1.20 when there's no LTA key
 * or LTA is down.
 * @param {{ lat: number, lng: number }} to
 */
export async function averageParking(to) {
  if (!process.env.LTA_ACCOUNT_KEY) return STANDARD_RATE
  try {
    const carparks = await getCarparks()
    const mallRates = {} // mall name → rate, so each mall counts once
    for (const c of carparks) {
      if (c.LotType !== 'C' || c.Agency !== 'LTA') continue // malls are listed under LTA
      const [lat, lng] = c.Location.split(' ').map(Number)
      if (distanceKm(to, { lat: lat, lng: lng }) > NEARBY_KM) continue

      const found = findMall(c.Development) // null if it's not in the 2018 list
      if (found) mallRates[found.mall] = found.rate
    }

    const rates = Object.values(mallRates)
    if (rates.length === 0) return STANDARD_RATE // no mall nearby: HDB / URA
    const average = rates.reduce((a, b) => a + b, 0) / rates.length
    return Math.round(average * 100) / 100 // to the cent
  } catch (error) {
    console.log('[api/_parking]', error.message)
    return STANDARD_RATE
  }
}
