// Owner: Surya
// Signing up from a page that needed a login ("Start a hangout" → /login?redirect=/hangouts/new)
// still goes through the Preferences setup, then on to that page. Logging in goes straight there.
// Without Supabase keys the account isn't real, so this checks where each step leads.
import { test, expect } from '@playwright/test'

async function createAccount(page) {
  await page.getByLabel('Name').fill('Test User')
  await page.getByLabel('Email').fill('test.user@example.test')
  await page.getByLabel('Password', { exact: true }).fill('testpass123')
  await page.getByRole('button', { name: 'Create account' }).click()
}

test('signing up on the way to New hangout shows the setup first, then New hangout', async ({
  page,
}) => {
  await page.goto('/login?mode=signup&redirect=/hangouts/new')
  await createAccount(page)
  await expect(page).toHaveURL('/preferences?setup=1&next=/hangouts/new')
  for (let step = 1; step <= 4; step++) {
    await expect(page.getByText(`Step ${step} of 4`)).toBeVisible()
    await page.getByRole('button', { name: 'Skip for now' }).click()
  }
  await expect(page).toHaveURL('/hangouts/new')
})

test('the setup never sends you to another website', async ({ page }) => {
  await page.goto('/preferences?setup=1&next=//example.com')
  for (let step = 1; step <= 4; step++) {
    await expect(page.getByText(`Step ${step} of 4`)).toBeVisible()
    await page.getByRole('button', { name: 'Skip for now' }).click()
  }
  await expect(page).toHaveURL('/dashboard')
})
