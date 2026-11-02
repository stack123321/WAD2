// Owner: Eashvar (testing; from Ryan's tests). E2E tests (Week 10c) for 08 Midpoint + crowd heat
// map on the Friday sample hangout: moving the time slider shows that time, and "See nearby
// spots" opens 09. Crowd levels come from api/crowd.js's sample data, since the tests run without
// an LTA key.
import { test, expect } from '@playwright/test'

test('moving the time slider shows that time', async ({ page }) => {
  await page.goto('/hangouts/demo/midpoint')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Midpoint + Crowd heat map')

  await page.getByLabel(/Time today/).fill('38') // slot 38 = 7:00 pm

  await expect(page.getByText('Time today: 7:00 pm')).toBeVisible()
})

test('See nearby spots opens 09', async ({ page }) => {
  await page.goto('/hangouts/demo/midpoint')

  await page.getByRole('link', { name: 'See nearby spots' }).click()

  await expect(page).toHaveURL('/hangouts/demo/explore')
})
