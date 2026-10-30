// Owner: Eashvar (testing). 10 Spot details on the demo hangout with fake Google Places answers
// (helpers/places.js): the spot's name, rating, price, distance and address, a link to Google
// Maps, why it does or doesn't suit the group (Criteria), adding it to the vote and removing it
// again, "Back to exploring", and a spot Google can't find.
import { test, expect } from '@playwright/test'
import { place, stubPlaces } from './helpers/places.js'

const CAFE = place('quiet-cafe', 'Quiet Corner Cafe', {
  rating: 4.6,
  review_count: 128,
  price_level: 2,
  address: '1 Bishan Place, Singapore 579841',
})

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-14T22:00:00+08:00'))
  await stubPlaces(page, [CAFE])
})

test('shows the spot’s name, rating, price, address and a Google Maps link', async ({ page }) => {
  await page.goto('/hangouts/demo/spots/quiet-cafe')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Quiet Corner Cafe')
  await expect(page.getByText('★ 4.6 · 128 reviews')).toBeVisible()
  await expect(page.getByText('$$', { exact: true })).toBeVisible()
  await expect(page.getByText('1 Bishan Place, Singapore 579841')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open Google Maps' })).toHaveAttribute(
    'href',
    'https://maps.google.com/?cid=quiet-cafe',
  )
})

test('explains how well it suits the group', async ({ page }) => {
  await page.goto('/hangouts/demo/spots/quiet-cafe')
  await expect(page.getByRole('heading', { name: 'Why it suits your group' })).toBeVisible()
  await expect(page.getByText(/^\d+%$/)).toBeVisible() // the match %, as the big number
  // the demo group's vibe is "chill, food", and a cafe is chill
  await expect(page.getByText(/Matches your hangout's "chill, food" vibe/)).toBeVisible()
})

test('Add to Vote adds it, and Remove from Vote takes it off again', async ({ page }) => {
  await page.goto('/hangouts/demo/spots/quiet-cafe')
  await page.getByRole('button', { name: 'Add to Vote' }).click()

  const remove = page.getByRole('button', { name: 'Remove from Vote' })
  await expect(remove).toBeVisible()
  await remove.click()
  await expect(page.getByRole('button', { name: 'Add to Vote' })).toBeEnabled()
})

test('Back to exploring returns to 09', async ({ page }) => {
  await page.goto('/hangouts/demo/spots/quiet-cafe')
  await page.getByRole('link', { name: 'Back to exploring' }).click()
  await expect(page).toHaveURL('/hangouts/demo/explore')
})

test('a spot Google can’t find says so instead of breaking', async ({ page }) => {
  await page.goto('/hangouts/demo/spots/no-such-place')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Spot not found')
  await expect(page.getByRole('button', { name: 'Add to Vote' })).toHaveCount(0)
})

test('on a phone it fits the screen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/hangouts/demo/spots/quiet-cafe')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Quiet Corner Cafe')
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(width).toBeLessThanOrEqual(375)
})
