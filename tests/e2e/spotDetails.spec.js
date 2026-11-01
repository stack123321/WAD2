// Owner: Eashvar (testing). E2E tests (Week 10c) for 10 Spot details on the Friday sample hangout,
// with fake Google Places answers (helpers/places.js). Each test opens the spot from 09, the way
// a user would: its details show, it can be added to the vote and removed again, "Back to
// exploring" returns to 09, and a spot Google can't find says so.
import { test, expect } from '@playwright/test'
import { setTime, VOTING_OPEN } from './helpers/clock.js'
import { place, stubPlaces } from './helpers/places.js'

const CAFE = place('quiet-cafe', 'Quiet Corner Cafe', {
  rating: 4.6,
  review_count: 128,
  address: '1 Bishan Place, Singapore 579841',
  image_urls: [
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E",
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 2 2'%3E%3C/svg%3E",
  ],
})

// Enable Google Places for the test, then open the cafe from 09.
async function openCafe(page) {
  await page.addInitScript(() =>
    window.localStorage.setItem('fairpoint.googlePlacesEnabled', 'true'),
  )
  await page.goto('/hangouts/demo/explore')
  await page.getByRole('link', { name: 'Quiet Corner Cafe', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Quiet Corner Cafe')
  await expect(page.getByRole('switch', { name: 'Google Places calls' })).toHaveCount(0)
}

test.beforeEach(async ({ page }) => {
  await setTime(page, VOTING_OPEN)
  await stubPlaces(page, [CAFE])
})

test('shows the spot’s name, rating and address', async ({ page }) => {
  await openCafe(page)

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Quiet Corner Cafe')
  await expect(page.getByText('★ 4.6 · 128 reviews')).toBeVisible()
  await expect(page.getByText('1 Bishan Place, Singapore 579841')).toBeVisible()
})

test('photo arrows navigate through the image carousel', async ({ page }) => {
  await openCafe(page)

  const previous = page.getByRole('button', { name: 'Previous photo' })
  const next = page.getByRole('button', { name: 'Next photo' })
  const firstIndicator = page.getByRole('button', { name: 'Show photo 1' })
  const secondIndicator = page.getByRole('button', { name: 'Show photo 2' })

  await expect(previous).toBeDisabled()
  await expect(next).toBeEnabled()
  await expect(firstIndicator).toHaveAttribute('aria-current', 'true')

  await next.click()
  await expect(previous).toBeVisible()
  await expect(next).toBeVisible()
  await expect(previous).toBeEnabled()
  await expect(next).toBeDisabled()
  await expect(secondIndicator).toHaveAttribute('aria-current', 'true')

  await previous.click()
  await expect(previous).toBeDisabled()
  await expect(next).toBeEnabled()
  await expect(firstIndicator).toHaveAttribute('aria-current', 'true')
})

test('large-screen photo gallery is centered and uses a bounded frame', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await openCafe(page)

  const gallery = page.locator('.preview-image')
  const viewport = page.locator('.preview-image__viewport')
  const galleryBounds = await gallery.boundingBox()
  const previewBounds = await page.locator('.spot__preview').boundingBox()
  const viewportStyle = await viewport.evaluate((element) => {
    const style = getComputedStyle(element)
    return { height: style.height, objectFit: getComputedStyle(element.querySelector('img')).objectFit }
  })

  expect(galleryBounds.width).toBeLessThanOrEqual(1100)
  expect(Math.abs(
    galleryBounds.x + galleryBounds.width / 2 - (previewBounds.x + previewBounds.width / 2),
  )).toBeLessThanOrEqual(1)
  expect(viewportStyle).toEqual({ height: '520px', objectFit: 'cover' })
})

test('shows estimated travel time to the spot for each friend', async ({ page }) => {
  await page.addInitScript(() =>
    window.localStorage.setItem('fairpoint.googlePlacesEnabled', 'true'),
  )
  await page.route('**/api/route**', (route) =>
    route.fulfill({ json: { mins: 32, cost: 1.5, steps: [] } }),
  )
  await page.goto('/hangouts/demo/spots/quiet-cafe')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Quiet Corner Cafe')

  const travelTimes = page.locator('.travel-time__row')
  await expect(travelTimes).toHaveCount(4)
  const ryanRow = travelTimes.filter({ hasText: 'Ryan' })
  await expect(ryanRow.locator('.avatar')).toHaveAttribute('title', 'Ryan')
  await expect(ryanRow.locator('.avatar')).toHaveText('R')
  await expect(ryanRow).toContainText('32 min · MRT')
  await expect(travelTimes.filter({ hasText: 'Nicole' })).toContainText('32 min · MRT')
  await expect(travelTimes.filter({ hasText: 'Surya' })).toContainText('32 min · Bus')
  await expect(travelTimes.filter({ hasText: 'Hugo' })).toContainText('32 min · Car')
})

test('Add to Vote adds it, and Remove from Vote takes it off again', async ({ page }) => {
  await openCafe(page)

  await page.getByRole('button', { name: 'Add to Vote' }).click()
  await expect(page.getByRole('button', { name: 'Remove from Vote' })).toBeVisible()

  await page.getByRole('button', { name: 'Remove from Vote' }).click()
  await expect(page.getByRole('button', { name: 'Add to Vote' })).toBeVisible()
})

test('Back to exploring returns to 09', async ({ page }) => {
  await openCafe(page)

  await page.getByRole('link', { name: 'Back to exploring' }).click()

  await expect(page).toHaveURL('/hangouts/demo/explore')
})

test('a spot Google can’t find says so instead of breaking', async ({ page }) => {
  await openCafe(page)

  await page.goto('/hangouts/demo/spots/no-such-place')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Spot not found')
})
