// Owner: Ryan
// page 04 against the real supabase database, each test logs in with the .env.local test account
import process from 'node:process'
import { test, expect } from '@playwright/test'

// logs in with the test account, then waits until the dashboard has opened
async function logIn(page) {
  await page.goto('/login?redirect=/dashboard')
  await page.locator('#auth-email').fill(process.env.E2E_EMAIL)
  await page.locator('#auth-password').fill(process.env.E2E_PASSWORD)
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL('/dashboard')
}

test('a new hangout shows on the dashboard and can be deleted', async ({ page }) => {
  await logIn(page)

  // unique name, so it can't be confused with a leftover from an earlier run
  const name = `E2E test ${Date.now()}`

  // create it through page 05, like a user would
  await page.goto('/hangouts/new')
  await page.locator('#hangout-name').fill(name)
  await page.locator('#hangout-date').fill('2030-01-15')
  await page.locator('#hangout-time').fill('19:00')
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL(/\/start$/)

  // back on the dashboard, its card (with its ⋯ menu) should be there
  await page.goto('/dashboard')
  const menuButton = page.locator(`button[aria-label="More options for ${name}"]`)
  await expect(menuButton).toBeVisible()

  // delete it through the ⋯ menu and the confirm dialog, so the shared database doesn't fill up with test hangouts
  await menuButton.click()
  await page.locator('.dropdown-menu.show').getByRole('button', { name: 'Delete hangout' }).click()
  await page.locator('#confirm-modal').getByRole('button', { name: 'Delete hangout' }).click()
  await expect(menuButton).toHaveCount(0)
})
