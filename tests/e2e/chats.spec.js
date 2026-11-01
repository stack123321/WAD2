// Owner: Eashvar (testing; from Ryan's tests). E2E tests (Week 10c) for My Chats: the list of
// hangout chats opens one, searching by hangout or person filters it, and "Chat" on Friends opens
// a one-to-one chat.
import { test, expect } from '@playwright/test'

test('My Chats lists the hangouts and opens a chat', async ({ page }) => {
  await page.goto('/chats')
  await expect(page.getByText('Saturday study session')).toBeVisible()

  await page.getByRole('link', { name: /Friday dinner after class/ }).click()

  await expect(page).toHaveURL('/chats/demo')
  await expect(page.getByRole('heading', { name: 'Friday dinner after class' })).toBeVisible()
})

test('searching by hangout name or by person filters the list', async ({ page }) => {
  await page.goto('/chats')
  const search = page.getByLabel('Search by hangout or person')

  await search.fill('Saturday')
  await expect(page.getByText('Saturday study session')).toBeVisible()
  await expect(page.getByText('Friday dinner after class')).toBeHidden()

  // Ryan is only in the Friday hangout
  await search.fill('Ryan')
  await expect(page.getByText('Friday dinner after class')).toBeVisible()
  await expect(page.getByText('Saturday study session')).toBeHidden()
})

test('Chat on the Friends page opens a one-to-one chat', async ({ page }) => {
  await page.goto('/friends')

  await page.getByRole('button', { name: 'Chat with Hugo' }).click()

  await expect(page).toHaveURL('/chats/direct/demo-direct-u-hugo')
  await expect(page.getByRole('heading', { name: 'Hugo' })).toBeVisible()
})
