// Owner: Eashvar (testing). E2E tests (Week 10c) for 10 Spot details on the Friday sample hangout,
// with fake Google Places answers (helpers/places.js). Each test opens the spot from 09, the way
// a user would: its details show, it can be added to the vote and removed again, "Back to
// exploring" returns to 09, and a spot Google can't find says so.
import { test, expect } from '@playwright/test'
import { setTime, VOTING_OPEN } from './helpers/clock.js'
import { place, stubPlaces, turnOnGooglePlaces } from './helpers/places.js'

const CAFE = place('quiet-cafe', 'Quiet Corner Cafe', {
  rating: 4.6,
  review_count: 128,
  address: '1 Bishan Place, Singapore 579841',
})

// Turn Google Places on in 09, then open the cafe
async function openCafe(page) {
  await page.goto('/hangouts/demo/explore')
  await turnOnGooglePlaces(page)
  await page.getByRole('link', { name: 'Quiet Corner Cafe', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Quiet Corner Cafe')
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
