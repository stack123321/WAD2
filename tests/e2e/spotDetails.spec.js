// Owner: Eashvar (testing). E2E tests (Week 10c) for 10 Spot details on the Friday sample hangout,
// with fake Google Places answers (helpers/places.js). Each test opens the spot from 09, the way
// a user would: its details show, its photos can be flipped through, each friend's travel time
// shows (from the sample routes /api/route gives without keys), it can be added to the vote and
// removed again, "Back to exploring" returns to 09, and a spot Google can't find says so.
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

// Open the cafe from 09, like a user would
async function openCafe(page) {
  await setTime(page, VOTING_OPEN)
  await stubPlaces(page, [CAFE])
  await page.goto('/hangouts/demo/explore')
  await page.getByRole('link', { name: 'Quiet Corner Cafe', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Quiet Corner Cafe')
}

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

test('shows how long each friend takes to get there, and how', async ({ page }) => {
  await openCafe(page)
  // each friend's row in the travel times list
  const friend = (name) => page.getByRole('listitem').filter({ hasText: name })

  await expect(friend('Ryan')).toContainText(/\d+ min · MRT/)
  await expect(friend('Nicole')).toContainText(/\d+ min · MRT/)
  await expect(friend('Surya')).toContainText(/\d+ min · Bus/)
  await expect(friend('Hugo')).toContainText(/\d+ min · Car/)
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
