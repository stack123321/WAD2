// Owner: Ryan. Page 08 crowd heat map, using the demo hangout.
import { test, expect } from '@playwright/test'

test('draws station circles and the midpoint pin', async ({ page }) => {
  await page.goto('/hangouts/demo/midpoint')
  await expect(page.locator('#crowd-map .midpoint-pin')).toBeVisible()
  // At least one station circle (the map opens zoomed in, so some are off-screen)
  await expect(page.locator('#crowd-map path.crowd')).not.toHaveCount(0)
})

test('moving the slider loads that time and updates the label', async ({ page }) => {
  await page.goto('/hangouts/demo/midpoint')
  await expect(page.locator('#crowd-map path.crowd')).not.toHaveCount(0)

  const request = page.waitForRequest((r) => r.url().includes('/api/crowd'))
  await page.getByLabel(/Time today/).fill('38') // slot 38 = 7:00 pm
  await request
  await expect(page.getByText('Time today: 7:00 pm')).toBeVisible()
})

test('See nearby spots goes to page 09', async ({ page }) => {
  await page.goto('/hangouts/demo/midpoint')
  await page.getByRole('link', { name: 'See nearby spots' }).click()
  await expect(page).toHaveURL('/hangouts/demo/explore')
})
