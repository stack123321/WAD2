// Owner: Ryan. Friends page with the sample people (no Supabase): you're Surya, friends with
// Ryan, Nicole and Hugo, with a request from Matrix. Requests are kept in memory.
import { test, expect } from '@playwright/test'

test('shows my friends, a request for me, and nothing pending', async ({ page }) => {
  await page.goto('/friends')
  await expect(page.locator('#my-friends')).toContainText('Ryan')
  await expect(page.locator('#my-friends')).toContainText('Nicole')
  await expect(page.locator('#my-friends')).toContainText('Hugo')
  await expect(page.locator('#friend-requests')).toContainText('Matrix')
  await expect(page.locator('#pending')).toContainText('No requests waiting.')
})

test('accepting a request moves them to My Friends', async ({ page }) => {
  await page.goto('/friends')
  await page.locator('#friend-requests').getByRole('button', { name: 'Accept' }).click()
  await expect(page.locator('#my-friends')).toContainText('Matrix')
  await expect(page.locator('#friend-requests')).toHaveCount(0)
})

test('searching and adding someone puts them in Pending', async ({ page }) => {
  await page.goto('/friends')
  await page.locator('#friend-search').fill('eash')
  await page.getByRole('button', { name: 'Search' }).click()
  await page.getByRole('button', { name: 'Add Eashvar as a friend' }).click()
  await expect(page.locator('#pending')).toContainText('Eashvar')
  await expect(page.locator('#search-results')).toContainText('Requested')
})

test('Add to hangout opens page 05 with that friend', async ({ page }) => {
  await page.goto('/friends')
  await page.getByRole('link', { name: 'Add Ryan to hangout' }).click()
  await expect(page).toHaveURL('/hangouts/new?with=u-ryan')
  await expect(page.getByText('Hanging out with Ryan')).toBeVisible()
})
