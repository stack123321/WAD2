// Owner: Eashvar (testing; from Ryan's tests). Page 04 against the real Supabase database (Week
// 10c, E2E with the real database). Each test logs in with the .env.local test account.
import process from 'node:process'
import { test, expect } from '@playwright/test'

// logs in with the test account, then waits until the dashboard has opened
async function logIn(page) {
  await page.goto('/login?redirect=/dashboard')
  await page.getByLabel('Email').fill(process.env.E2E_EMAIL)
  await page.getByLabel('Password', { exact: true }).fill(process.env.E2E_PASSWORD)
  await page.getByRole('button', { name: 'Log in', exact: true }).last().click()
  await expect(page).toHaveURL('/dashboard')
}

test('a new hangout shows on the dashboard and can be deleted', async ({ page }) => {
  await logIn(page)

  // unique name, so it can't be confused with a leftover from an earlier run
  const name = `E2E test ${Date.now()}`

  // create it through page 05, like a user would
  await page.goto('/hangouts/new')
  await page.getByLabel(/Hangout name/).fill(name)
  await page.getByLabel('Date').fill('2030-01-15')
  await page.getByLabel('Time').fill('19:00')
  await page.getByRole('button', { name: 'Create & add starting points' }).click()
  await expect(page).toHaveURL(/\/start$/)

  // back on the dashboard, its card (with its ⋯ menu) should be there
  await page.goto('/dashboard')
  const menuButton = page.getByRole('button', { name: `More options for ${name}` })
  await expect(menuButton).toBeVisible()

  // delete it through the ⋯ menu and the confirm dialog, so the shared database doesn't fill up with test hangouts
  await menuButton.click()
  await page.getByRole('button', { name: 'Delete hangout' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete hangout' }).click()
  await expect(menuButton).toBeHidden()
})
