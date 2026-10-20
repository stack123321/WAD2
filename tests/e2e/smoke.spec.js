// Owner: Eashvar (testing lead). Smoke test: every page opens with the right <h1>, and the two main
// journeys click through on the demo hangout, finding each link or button by its accessible name.
// Run without Supabase keys, or the login guard sends every page to /login.
import { test, expect } from '@playwright/test'

const GREETING = /^Hey .+\.$/

test.beforeEach(async ({ page }) => {
  await stubNearbySpots(page)
})

async function stubNearbySpots(page) {
  await page.route('**/api/places**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        {
          source: 'google',
          source_place_id: 'test-cafe',
          name: 'Test Cafe',
          category: 'cafe',
          lat: 1.3508,
          lng: 103.8485,
          rating: 4.5,
          review_count: 20,
          price_level: 2,
          image_url: null,
          distance_m: 250,
          nearest_station_name: 'Bishan',
          station_distance_m: 300,
          tags: [],
        },
      ]),
    }),
  )
}

const pages = [
  ['/', 'Meet in the middle.'],
  ['/login', 'Welcome back.'],
  ['/preferences', 'Tell us what you like.'],
  ['/dashboard', GREETING],
  ['/hangouts/new', 'New hangout.'],
  ['/hangouts/demo/start', 'Where is everyone coming from?'],
  ['/hangouts/demo/transport', 'How’s everyone getting there?'],
  ['/hangouts/demo/midpoint', 'Bishan.'],
  ['/hangouts/demo/explore', 'Spots near Bishan.'],
  ['/hangouts/demo/vote', 'Pick one.'],
  ['/hangouts/demo/plan', 'Mock Cafe (sample data).'],
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
  await expect(page.getByText('Google Places is off. Turn it on to find nearby spots.')).toBeVisible()
  expect(placesRequests).toBe(0)

  await toggle.check()
  await expect(page.getByRole('link', { name: 'Test Cafe', exact: true })).toBeVisible()
  expect(placesRequests).toBe(1)

  await toggle.uncheck()
  await expect(page.getByText('Google Places is off. Turn it on to find nearby spots.')).toBeVisible()
  expect(placesRequests).toBe(1)
})

test('new hangout: landing to final plan', async ({ page }) => {
  const h1 = page.getByRole('heading', { level: 1 })
  await page.goto('/hangouts/new')
  await expect(h1).toHaveText('New hangout.')
  await page.getByLabel('Hangout name').fill('Smoke test hangout')
  await page.getByLabel('Date').fill('2030-01-15')
  await page.getByLabel('Time').fill('19:00')
  await page.getByRole('button', { name: 'Create & add starting points' }).click()
  await expect(h1).toHaveText('Where is everyone coming from?')

  await page.getByRole('link', { name: 'Next: choose transport' }).click()
  await expect(h1).toHaveText('How’s everyone getting there?')
  // A button now: it saves the fairest station for the group, then opens 08
  await page.getByRole('button', { name: 'Find our midpoint' }).click()
  await expect(h1).toHaveText(/.+\.$/)
  await page.getByRole('link', { name: 'See nearby spots' }).click()
  // The fairest station depends on live travel times, so any area name will do
  await expect(h1).toHaveText(/^Spots near .+/)

  await page.getByRole('switch', { name: 'Google Places calls' }).check()
  await page.getByRole('link', { name: 'Test Cafe', exact: true }).first().click()
  await expect(h1).toHaveText('Test Cafe.')

  await page.goto('/hangouts/demo/vote')
  await expect(h1).toHaveText('Pick one.')
  await page.getByRole('button', { name: 'Close vote' }).click()
  await expect(h1).toHaveText('Mock Board Game Cafe (sample data).')
})

test('sign up: log in page to dashboard', async ({ page }) => {
  const h1 = page.getByRole('heading', { level: 1 })
  await page.goto('/login?mode=signup')
  await page.getByLabel('Name').fill('Test User')
  await page.getByLabel('Email').fill('test@example.test')
  await page.getByLabel('Password', { exact: true }).fill('testpass123')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(h1).toHaveText('Tell us what you like.')

  await page.getByRole('link', { name: 'Skip for now' }).click()
  await expect(h1).toHaveText(GREETING)
  await expect(h1).toContainText('Test User')
})
