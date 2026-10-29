// Owner: Eashvar (testing). The Crowds page (from "Crowds right now" on 04): the heat map of MRT
// stations draws, moving the time slider loads that time, and "← My hangouts" goes back. Crowd
// levels come from api/crowd.js's sample data when there's no LTA key.
import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/crowds')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Crowds at MRT stations')
})

test('draws a circle for the stations', async ({ page }) => {
  await expect(page.locator('#crowd-map path.crowd')).not.toHaveCount(0)
})

test('moving the slider loads that time and updates the label', async ({ page }) => {
  await expect(page.locator('#crowd-map path.crowd')).not.toHaveCount(0)
  const request = page.waitForRequest((r) => r.url().includes('/api/crowd'))
  await page.getByLabel(/Time today/).fill('38') // slot 38 = 7:00 pm
  await request
  await expect(page.getByText('Time today: 7:00 pm')).toBeVisible()
})

test('← My hangouts goes back to the dashboard', async ({ page }) => {
  await page.getByRole('link', { name: '← My hangouts' }).click()
  await expect(page).toHaveURL('/dashboard')
})
