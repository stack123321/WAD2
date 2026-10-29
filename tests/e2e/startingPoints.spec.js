// Owner: Eashvar (testing). 06 Starting points on the demo hangout (here you're Surya, coming
// from Holland Village): everyone's starting point is listed, searching OneMap and picking a result
// changes yours, a search with no match says what to try, and "Use my current location" uses the
// browser's location. /api/search and /api/reverse are faked so the results are always the same.
import { test, expect } from '@playwright/test'

const BISHAN = {
  label: 'Bishan MRT',
  address: 'Bishan MRT',
  lat: 1.3508,
  lng: 103.8485,
  postal: null,
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/search**', (route) => {
    const q = new URL(route.request().url()).searchParams.get('q').toLowerCase()
    return route.fulfill({ json: 'bishan'.startsWith(q.slice(0, 3)) ? [BISHAN] : [] })
  })
  await page.route('**/api/reverse**', (route) =>
    route.fulfill({
      json: {
        label: 'Marina Bay Sands',
        address: '10 Bayfront Avenue',
        lat: 1.2834,
        lng: 103.8607,
        postal: '018956',
      },
    }),
  )
  await page.goto('/hangouts/demo/start')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Where is everyone coming from?')
})

const row = (page, name) => page.getByRole('listitem').filter({ hasText: name })

test('lists everyone with where they’re coming from', async ({ page }) => {
  await expect(row(page, 'Ryan')).toContainText('Tampines MRT')
  await expect(row(page, 'Nicole')).toContainText('Jurong East MRT')
  await expect(row(page, 'Surya (you)')).toContainText('Holland Village MRT')
  await expect(row(page, 'Hugo')).toContainText('Punggol MRT')
})

test('searching and picking a place changes my starting point', async ({ page }) => {
  const search = page.getByRole('combobox')
  await search.fill('Bishan')
  await page.getByRole('option', { name: /Bishan MRT/ }).click()

  await expect(row(page, 'Surya (you)')).toContainText('Bishan MRT')
  await expect(page.getByRole('link', { name: 'Next: choose transport' })).toBeVisible()
})

test('a search with no match says what to try instead', async ({ page }) => {
  await page.getByRole('combobox').fill('zzzz')
  await expect(
    page.getByText('No places match "zzzz". Try an MRT name or a 6-digit postal code.'),
  ).toBeVisible()
})

test('Use my current location fills in where I am', async ({ page, context }) => {
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 1.2834, longitude: 103.8607 })

  await page.getByRole('button', { name: 'Use my current location' }).click()
  await expect(row(page, 'Surya (you)')).toContainText('Marina Bay Sands')
})

test('Next: choose transport opens 07', async ({ page }) => {
  await page.getByRole('link', { name: 'Next: choose transport' }).click()
  await expect(page).toHaveURL('/hangouts/demo/transport')
})
