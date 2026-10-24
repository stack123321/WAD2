// Owner: Eashvar (testing). Shared steps for tests that sign up: after "Create account", 03
// Preferences runs the step-by-step onboarding ("Get started", then a "Skip for now" on each step).
// skipOnboarding presses through it until the dashboard opens, however many steps there are.
import { expect } from '@playwright/test'

export async function signUp(page, { name = 'Test User', email = 'test.user@example.test' } = {}) {
  await page.goto('/login?mode=signup')
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('testpass123')
  await page.getByRole('button', { name: 'Create account' }).click()
}

export async function skipOnboarding(page) {
  await page.getByRole('button', { name: 'Get started' }).click()
  const skip = page.getByRole('button', { name: 'Skip for now' })
  // Keep skipping until the last step saves and the dashboard opens
  await expect(async () => {
    if (await skip.isVisible()) await skip.click()
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 500 })
  }).toPass({ timeout: 15000 })
}
