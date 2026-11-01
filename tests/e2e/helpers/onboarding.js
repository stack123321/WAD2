// Owner: Eashvar (testing). Shared steps for tests that sign up. After "Create account", 03
// Preferences runs a 4-step setup ("Get started", then "Skip for now" on each step), and the
// last step opens My hangouts. Each step's "Step N of 4" is checked before skipping it, so a
// click never lands on the step before.
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
  for (let step = 1; step <= 4; step++) {
    await expect(page.getByText(`Step ${step} of 4`)).toBeVisible()
    await page.getByRole('button', { name: 'Skip for now' }).click()
  }
  await expect(page).toHaveURL('/dashboard')
}
