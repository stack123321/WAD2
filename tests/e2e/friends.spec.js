// Owner: Eashvar (testing; from Ryan's tests). E2E tests (Week 10c) for the Friends page with the
// sample people (you're Surya; requests are kept in memory): accepting a request, searching and
// sending one, "Add to hangout", and removing a friend after "Are you sure?".
import { test, expect } from '@playwright/test'

test('accepting a friend request makes them a friend', async ({ page }) => {
  await page.goto('/friends')
  await expect(page.getByRole('heading', { name: 'Friend requests' })).toBeVisible()

  await page.getByRole('button', { name: 'Accept' }).click()

  await expect(page.getByRole('heading', { name: 'Friend requests' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Chat with Matrix' })).toBeVisible()
})

test('searching for someone and adding them sends a friend request', async ({ page }) => {
  await page.goto('/friends')
  await page.getByLabel('Search by name or email').fill('eash')
  await page.getByRole('button', { name: 'Search', exact: true }).click()

  await page.getByRole('button', { name: 'Add Eashvar as a friend' }).click()

  await expect(page.getByText('✓ Friend request sent to Eashvar.')).toBeVisible()
})

test('Add to hangout opens page 05 with that friend', async ({ page }) => {
  await page.goto('/friends')

  await page.getByRole('link', { name: 'Add Ryan to hangout' }).click()

  await expect(page).toHaveURL('/hangouts/new?with=u-ryan')
  await expect(page.getByText('Hanging out with Ryan')).toBeVisible()
})

test('removing a friend asks first', async ({ page }) => {
  await page.goto('/friends')
  await page.getByRole('button', { name: 'More options for Ryan' }).click()
  await page.getByRole('button', { name: 'Remove Ryan as a friend' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()

  await page.getByRole('dialog').getByRole('button', { name: 'Remove friend' }).click()

  await expect(page.getByRole('button', { name: 'Chat with Ryan' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Chat with Nicole' })).toBeVisible()
})
