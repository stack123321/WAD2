// Owner: Eashvar (testing; from Ryan's tests). E2E tests (Week 10c) for 08 Midpoint + crowd heat
// map on the Friday sample hangout: moving the time slider shows that time, and "See nearby
// spots" opens 09. Crowd levels come from api/crowd.js's sample data, since the tests run without
// an LTA key.
import { test, expect } from '@playwright/test'

test('moving the time slider shows that time', async ({ page }) => {
  await page.goto('/hangouts/demo/midpoint')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Midpoint')

  await page.getByLabel(/Time today/).fill('38') // slot 38 = 7:00 pm

  await expect(page.getByText('Time today: 7:00 pm')).toBeVisible()
})

test('See nearby spots opens 09', async ({ page }) => {
  await page.goto('/hangouts/demo/midpoint')

  await page.getByRole('link', { name: 'See nearby spots' }).click()

  await expect(page).toHaveURL('/hangouts/demo/explore')
})

test('moving the midpoint asks first, then clears the shortlist and votes', async ({ page }) => {
  await page.goto('/hangouts/demo/midpoint')
  // the first tab is the midpoint itself, the second is the next best station
  await page.getByRole('tab').nth(1).click()
  await page.getByRole('button', { name: /our midpoint$/ }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Move the midpoint')
  await dialog.getByRole('button', { name: 'Move midpoint' }).click()

  // the step bar's link, not page.goto, so the sample hangout in the store keeps the change
  await page.getByRole('link', { name: /Vote$/ }).click()
  await expect(
    page.getByText(/Voting hasn't started yet|Waiting for .* to start the vote/),
  ).toBeVisible()
})

test('another station that is fairer can be moved to, after asking', async ({ page }) => {
  await page.goto('/hangouts/demo/midpoint')
  await expect(page.getByText('Springleaf is now the fairest station')).toBeVisible()

  await page.getByRole('button', { name: 'Move to Springleaf' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Move midpoint' }).click()

  await expect(page.getByRole('heading', { name: 'Springleaf MRT', exact: true })).toBeVisible()
  await expect(page.getByText('is now the fairest station')).toBeHidden()
})

test('a locked midpoint cannot be moved until it is unlocked', async ({ page }) => {
  await page.goto('/hangouts/demo/midpoint')
  await page.getByRole('button', { name: 'Lock midpoint' }).click()

  await expect(page.getByText('Locked by you')).toBeVisible()
  await expect(page.getByText('is now the fairest station')).toBeHidden()
  await page.getByRole('tab').nth(1).click()
  await expect(page.getByRole('button', { name: /our midpoint$/ })).toBeDisabled()

  await page.getByRole('button', { name: 'Unlock midpoint' }).click()
  await expect(page.getByText('is now the fairest station')).toBeVisible()
})
