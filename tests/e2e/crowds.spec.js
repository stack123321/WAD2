// Owner: Eashvar (testing). E2E tests (Week 10c) for the Crowds page (from "Crowds right now" on
// 04): moving the time slider shows that time, and "← My hangouts" goes back. Crowd levels come
// from api/crowd.js's sample data, since the tests run without an LTA key.
import { test, expect } from '@playwright/test'

test('moving the time slider shows that time', async ({ page }) => {
  await page.goto('/crowds')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Crowds at MRT stations')

  await page.getByLabel(/Time today/).fill('38') // slot 38 = 7:00 pm

  await expect(page.getByText('Time today: 7:00 pm')).toBeVisible()
})

test('← My hangouts goes back to the dashboard', async ({ page }) => {
  await page.goto('/crowds')

  await page.getByRole('link', { name: '← My hangouts' }).click()

  await expect(page).toHaveURL('/dashboard')
})
