// Owner: Ryan. Page 04 against the real Supabase database (not the mock data).
// Each test logs in with the test account from .env.local first.
import process from 'node:process'
import { test, expect } from '@playwright/test'

// Logs in with the test account, then waits until the dashboard has opened
async function logIn(page) {
  await page.goto('/login?redirect=/dashboard')
  await page.locator('#auth-email').fill(process.env.E2E_EMAIL)
  await page.locator('#auth-password').fill(process.env.E2E_PASSWORD)
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL('/dashboard')
}

test('a new hangout shows on the dashboard and can be deleted', async ({ page }) => {
  await logIn(page)

  // Unique name, so it can't be confused with a leftover from an earlier run
  const name = `E2E test ${Date.now()}`

  // Create it through page 05, like a user would
  await page.goto('/hangouts/new')
  await page.locator('#hangout-name').fill(name)
  await page.locator('#hangout-date').fill('2030-01-15')
  await page.locator('#hangout-time').fill('19:00')
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL(/\/start$/)

  // Back on the dashboard, its card (with its Delete button) should be there
  await page.goto('/dashboard')
  const deleteButton = page.locator(`button[aria-label="Delete ${name}"]`)
  await expect(deleteButton).toBeVisible()

  // Delete it, so the shared database doesn't fill up with test hangouts
  page.once('dialog', (dialog) => dialog.accept())
  await deleteButton.click()
  await expect(deleteButton).toHaveCount(0)
})
