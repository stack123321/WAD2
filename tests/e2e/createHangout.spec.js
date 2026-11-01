// Owner: Eashvar (testing). E2E tests (Week 10c) for 05 New hangout: Create stays greyed out and
// says what's missing until there's a date, and creating opens 06 Starting points. Without
// Supabase keys nothing is saved, so this checks the form's behaviour. The dates are in 2030 so
// they're always in the future.
import { test, expect } from '@playwright/test'

test('Create says what’s missing until there’s a date', async ({ page }) => {
  await page.goto('/hangouts/new')
  const create = page.getByRole('button', { name: 'Create & add starting points' })

  await expect(create).toBeDisabled()
  await expect(page.getByText('Add a date to continue.')).toBeVisible()

  await page.getByLabel('Date').fill('2030-01-15')

  await expect(create).toBeEnabled()
})

test('creating a hangout opens 06 Starting points', async ({ page }) => {
  await page.goto('/hangouts/new')
  await page.getByLabel('Hangout name').fill('Test dinner')
  await page.getByLabel('Date').fill('2030-01-15')
  await page.getByLabel('Time').fill('19:00')

  await page.getByRole('button', { name: 'Create & add starting points' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Where is everyone coming from?')
})
