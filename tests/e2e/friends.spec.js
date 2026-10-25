// Owner: Ryan
// friends page with the sample people, you're surya (requests kept in memory)
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

test('searching and adding someone puts them in Pending and clears the search', async ({
  page,
}) => {
  await page.goto('/friends')
  await page.locator('#friend-search').fill('eash')
  await page.locator('#friend-search').press('Enter')
  await page.getByRole('button', { name: 'Add Eashvar as a friend' }).click()
  await expect(page.locator('#pending')).toContainText('Eashvar')
  await expect(page.getByRole('status')).toHaveText('✓ Friend request sent to Eashvar.')
  await expect(page.locator('#friend-search')).toHaveValue('')
  await expect(page.locator('#search-results')).toHaveCount(0)
})

test('the Search button searches too, for people who do not press Enter', async ({ page }) => {
  await page.goto('/friends')
  await page.locator('#friend-search').fill('eash')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.locator('#search-results')).toContainText('Eashvar')
})

test('a friend in the results shows Friends ✓ with Add to hangout and Chat', async ({ page }) => {
  await page.goto('/friends')
  await page.locator('#friend-search').fill('ry')
  await page.locator('#friend-search').press('Enter')
  const row = page.locator('#search-results .person', { hasText: 'Ryan' })
  await expect(row).toContainText('Friends ✓')
  await expect(row.getByRole('link', { name: 'Add Ryan to hangout' })).toBeVisible()
  await expect(row.getByRole('button', { name: 'Chat with Ryan' })).toBeVisible()
})

test('the navbar shows a badge for a friend request, gone once accepted', async ({ page }) => {
  await page.goto('/login?redirect=/friends')
  await page.getByLabel('Email').fill('ryan@example.com')
  await page.getByLabel('Password', { exact: true }).fill('password123')
  await page.getByRole('button', { name: 'Log in', exact: true }).last().click()
  await expect(page).toHaveURL('/friends')
  const badge = page.locator('.topbar .badge')
  await expect(badge).toHaveText('1 new')
  await page.locator('#friend-requests').getByRole('button', { name: 'Accept' }).click()
  await expect(badge).toHaveCount(0)
})

test('Add to hangout opens page 05 with that friend', async ({ page }) => {
  await page.goto('/friends')
  await page.getByRole('link', { name: 'Add Ryan to hangout' }).click()
  await expect(page).toHaveURL('/hangouts/new?with=u-ryan')
  await expect(page.getByText('Hanging out with Ryan')).toBeVisible()
})

test('removing a friend asks "Are you sure?" then removes them', async ({ page }) => {
  await page.goto('/friends')
  await page.getByRole('button', { name: 'More options for Ryan' }).click()
  await page.getByRole('button', { name: 'Remove Ryan as a friend' }).click()
  await expect(page.locator('#my-friends')).toContainText('Are you sure?')
  await page.getByRole('button', { name: 'Yes, remove' }).click()
  await expect(page.locator('#my-friends')).not.toContainText('Ryan')
  await expect(page.locator('#my-friends')).toContainText('Nicole')
})

test('cancelling "Are you sure?" keeps the friend', async ({ page }) => {
  await page.goto('/friends')
  await page.getByRole('button', { name: 'More options for Hugo' }).click()
  await page.getByRole('button', { name: 'Remove Hugo as a friend' }).click()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.locator('#my-friends')).toContainText('Hugo')
  await expect(page.locator('#my-friends')).not.toContainText('Are you sure?')
})
