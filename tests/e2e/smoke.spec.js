// Owner: Eashvar (testing lead). Smoke test: every page opens with the right <h1>, and the two main
// journeys click through on the demo hangout, finding each link or button by its accessible name.
// Run without Supabase keys, or the login guard sends every page to /login.
import { test, expect } from '@playwright/test'
import { signUp, skipOnboarding } from './helpers/onboarding.js'

const GREETING = /^Good (morning|afternoon|evening)(, .+)?!$/

test.beforeEach(async ({ page }) => {
  await stubNearbySpots(page)
})

// One cafe right at the midpoint the page searches around. The new hangout's midpoint depends on
// the sample starting points (Marymount at the moment, not Bishan), so the cafe follows the
// search instead of sitting at a fixed place that 09's "Within 1 km" filter could hide.
// 10 Spot details asks for the one spot by id (?id=), and for Google's summary (&summary=1).
async function stubNearbySpots(page) {
  let lat = 1.3508
  let lng = 103.8485
  await page.route('**/api/places**', (route) => {
    const url = new URL(route.request().url())
    if (url.searchParams.get('summary')) return route.fulfill({ json: null })
    if (!url.searchParams.get('id')) {
      lat = Number(url.searchParams.get('lat')) || lat
      lng = Number(url.searchParams.get('lng')) || lng
    }
    const cafe = testCafe(lat, lng)
    return route.fulfill({ json: url.searchParams.get('id') ? cafe : [cafe] })
  })
}

function testCafe(lat, lng) {
  return {
    source: 'google',
    source_place_id: 'test-cafe',
    name: 'Test Cafe',
    category: 'cafe',
    lat,
    lng,
    rating: 4.5,
    review_count: 20,
    price_level: 2,
    image_url: null,
    distance_m: 250,
    nearest_station_name: 'Bishan',
    station_distance_m: 300,
    tags: [],
  }
}

const pages = [
  ['/', /^Meet halfway\.\s*Hang out better\.$/],
  ['/login', 'Stop arguing about where to meet.'],
  ['/preferences', 'Tell us what you like'],
  ['/dashboard', GREETING],
  ['/chats', 'My Chats'],
  ['/hangouts/new', 'New hangout'],
  ['/hangouts/demo/start', 'Where is everyone coming from?'],
  ['/hangouts/demo/transport', 'How is everyone getting there?'],
  ['/hangouts/demo/midpoint', 'Meet at Bishan'],
  ['/hangouts/demo/explore', 'Spots near Bishan'],
  ['/hangouts/demo/vote', 'Group voting'],
  ['/hangouts/demo/plan', "So far it's Mock Cafe (sample data)"],
]

for (const [path, title] of pages) {
  test(`opens ${path}`, async ({ page }) => {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
  })
}

test('Google Places calls stay off until enabled', async ({ page }) => {
  let placesRequests = 0
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/places') placesRequests += 1
  })

  await page.goto('/hangouts/demo/explore')
  const toggle = page.getByRole('switch', { name: 'Google Places calls' })
  await expect(toggle).not.toBeChecked()
  await expect(
    page.getByText('Google Places is off. Turn it on to find nearby spots.'),
  ).toBeVisible()
  expect(placesRequests).toBe(0)

  await toggle.check()
  await expect(page.getByRole('link', { name: 'Test Cafe', exact: true })).toBeVisible()
  expect(placesRequests).toBe(1)

  await toggle.uncheck()
  await expect(
    page.getByText('Google Places is off. Turn it on to find nearby spots.'),
  ).toBeVisible()
  expect(placesRequests).toBe(1)
})

test('new hangout: landing to final plan', async ({ page }) => {
  const h1 = page.getByRole('heading', { level: 1 })
  await page.goto('/')

  await page.getByRole('link', { name: 'Start a hangout' }).first().click()
  await expect(h1).toHaveText('New hangout')
  await page.getByLabel('Hangout name').fill('Smoke test hangout')
  await page.getByLabel('Date').fill('2030-01-15')
  await page.getByLabel('Time').fill('19:00')
  await page.getByRole('button', { name: 'Create & add starting points' }).click()
  await expect(h1).toHaveText('Where is everyone coming from?')

  await page.getByRole('link', { name: 'Next: choose transport' }).click()
  await expect(h1).toHaveText('How is everyone getting there?')
  // A button now: it saves the fairest station for the group, then opens 08
  await page.getByRole('button', { name: 'Find our midpoint' }).click()
  // The fairest station depends on live travel times, so any area name will do
  await expect(h1).toHaveText(/^Meet at .+/)
  await page.getByRole('link', { name: 'See nearby spots' }).click()
  await expect(h1).toHaveText(/^Spots near .+/)

  await page.getByRole('switch', { name: 'Google Places calls' }).check()
  await page.getByRole('link', { name: 'Test Cafe', exact: true }).first().click()
  await expect(h1).toHaveText('Test Cafe')

  await page.goto('/hangouts/demo/vote')
  await expect(h1).toHaveText('Group voting')
  await page.getByRole('button', { name: 'Close vote' }).click()
  await expect(h1).toHaveText(/^You're going to .+/)
})

test('sign up: log in page to dashboard', async ({ page }) => {
  const h1 = page.getByRole('heading', { level: 1 })
  await signUp(page, { email: 'test@example.test' })
  await expect(h1).toHaveText('Tell us what you like')

  await skipOnboarding(page)
  await expect(h1).toHaveText(GREETING)
  await expect(h1).toContainText('Test User')
})
