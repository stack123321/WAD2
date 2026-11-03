// Owner: Eashvar (testing). E2E tests (Week 10c) for 03 Preferences: saving says "Saved ✓", and
// the 4-step setup after sign up (?setup=1) goes Step 1 of 4 … Step 4 of 4 → My
// hangouts. Without Supabase keys nothing is stored, so this checks the page's behaviour.
import { test, expect } from '@playwright/test'

test('saving my preferences says so', async ({ page }) => {
  await page.goto('/preferences')
  await page.getByRole('button', { name: /Cafes/ }).click()

  await page.getByRole('button', { name: 'Save preferences' }).click()

  await expect(page.getByText('Saved ✓')).toBeVisible()
})

test('the setup after sign up goes through 4 steps and ends on My hangouts', async ({ page }) => {
  await page.goto('/preferences?setup=1')
  await expect(page.getByText('Step 1 of 4')).toBeVisible()

  // step 1 needs at least one activity
  await page.getByRole('button', { name: /Cafes/ }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByText('Step 2 of 4')).toBeVisible()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByText('Step 3 of 4')).toBeVisible()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByText('Step 4 of 4')).toBeVisible()
  await page.getByRole('button', { name: 'Save preferences' }).click()

  await expect(page).toHaveURL('/dashboard')
})
