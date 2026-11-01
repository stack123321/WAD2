// Owner: Eashvar (testing). E2E tests (Week 10c) for 07 Transport on the Friday sample hangout:
// everyone is listed with where they're coming from, and "Find our midpoint" saves the fairest
// station and opens 08. Travel times come from api/route.js's sample routes, since the tests run
// without OneMap keys.
import { test, expect } from '@playwright/test'

test('lists everyone with where they’re coming from', async ({ page }) => {
  await page.goto('/hangouts/demo/transport')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('How is everyone getting there?')
  await expect(page.getByText('From Tampines', { exact: false })).toBeVisible()
  await expect(page.getByText('From Punggol', { exact: false })).toBeVisible()
})

test('Find our midpoint opens 08', async ({ page }) => {
  await page.goto('/hangouts/demo/transport')

  await page.getByRole('button', { name: 'Find our midpoint' }).click()

  await expect(page).toHaveURL('/hangouts/demo/midpoint')
})
