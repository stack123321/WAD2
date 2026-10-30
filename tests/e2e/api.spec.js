// Checks that each api/ function answers (with sample data until the real calls are built)
// and keeps the shape the pages rely on. Runs against `npm run dev`.
import { test, expect } from '@playwright/test'

const tampines = { lat: 1.3547, lng: 103.9452 }
const bishan = { lat: 1.3508, lng: 103.8485 }

test('/api/route gives travel time, cost and steps', async ({ request }) => {
  for (const mode of ['walk', 'bus', 'mrt', 'car']) {
    const res = await request.get('/api/route', {
      params: {
        fromLat: tampines.lat,
        fromLng: tampines.lng,
        toLat: bishan.lat,
        toLng: bishan.lng,
        mode,
      },
    })
    expect(res.ok()).toBeTruthy()
    const route = await res.json()
    expect(route.mins).toBeGreaterThan(0)
    expect(typeof route.cost).toBe('number')
    expect(route.steps.length).toBeGreaterThan(0)
  }
})

test('/api/route rejects a missing mode', async ({ request }) => {
  const res = await request.get('/api/route', { params: { fromLat: 1.35, fromLng: 103.9 } })
  expect(res.status()).toBe(400)
})

test('/api/crowd gives a level per station', async ({ request }) => {
  const res = await request.get('/api/crowd') // no ?at= → now: real-time with a key, sample data without
  expect(res.ok()).toBeTruthy()
  const stations = await res.json()
  expect(stations.length).toBeGreaterThan(0)
  for (const s of stations) expect(['l', 'm', 'h']).toContain(s.level)
})

test('/api/crowd rejects a date that is not a date', async ({ request }) => {
  const res = await request.get('/api/crowd', { params: { at: 'banana' } })
  expect(res.status()).toBe(400)
})

test('/api/places gives shortlist-shaped places near the centre', async ({ request }) => {
  const res = await request.get('/api/places', {
    params: { lat: bishan.lat, lng: bishan.lng, radius: 800, categories: 'cafe,food' },
  })
  // Nearby places have no sample data, so without GOOGLE_PLACES_API_KEY (e.g. on GitHub) there's
  // nothing to check
  // eslint-disable-next-line playwright/no-skipped-test -- only when there's no Google key
  test.skip(res.status() === 503, 'GOOGLE_PLACES_API_KEY is not set')
  expect(res.ok()).toBeTruthy()
  const places = await res.json()
  expect(places.length).toBeGreaterThan(0)
  for (const p of places) {
    expect(['cafe', 'food']).toContain(p.category)
    expect(p.distance_m).toBeLessThanOrEqual(800)
    expect(p).toHaveProperty('source_place_id')
  }
})

test('unknown /api path gives 404', async ({ request }) => {
  const res = await request.get('/api/nope')
  expect(res.status()).toBe(404)
})
