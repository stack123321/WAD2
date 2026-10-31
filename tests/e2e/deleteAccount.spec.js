// Owner: Surya
// "Delete my account" on 03 Preferences. Without Supabase keys nothing is stored, so this checks
// the page: hidden during setup, Delete forever only works after typing DELETE, and it logs out.
import { test, expect } from '@playwright/test'

test('Delete my account is not shown during setup after sign up', async ({ page }) => {
  await page.goto('/preferences?setup=1')
  await expect(page.getByRole('button', { name: 'Get started' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Delete my account' })).toHaveCount(0)
})

test('Delete forever only works after typing DELETE, and Cancel closes the box', async ({
  page,
}) => {
  await page.goto('/preferences')
  await page.getByRole('button', { name: 'Delete my account' }).click()
  const confirm = page.getByRole('button', { name: 'Delete forever' })
  await expect(confirm).toBeDisabled()
  await page.getByLabel('Type DELETE to confirm').fill('delet')
  await expect(confirm).toBeDisabled()
  await page.getByLabel('Type DELETE to confirm').fill('delete')
  await expect(confirm).toBeEnabled()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('button', { name: 'Delete my account' })).toBeVisible()
})

test('deleting goes to the landing page', async ({ page }) => {
  await page.goto('/preferences')
  await page.getByRole('button', { name: 'Delete my account' }).click()
  await page.getByLabel('Type DELETE to confirm').fill('DELETE')
  await page.getByRole('button', { name: 'Delete forever' }).click()
  await expect(page).toHaveURL('/')
})
