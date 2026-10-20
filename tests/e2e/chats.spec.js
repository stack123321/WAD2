// Owner: Ryan. My Chats: the list of hangouts with search, and one chat page per hangout.
import { test, expect } from '@playwright/test'

test('My Chats lists the hangouts and opens one chat page', async ({ page }) => {
  await page.goto('/chats')
  await expect(page.getByText('Friday dinner after class')).toBeVisible()
  await expect(page.getByText('Saturday study session')).toBeVisible()
  await page.getByRole('link', { name: /Friday dinner after class/ }).click()
  await expect(page).toHaveURL('/chats/demo')
  await expect(page.getByRole('heading', { name: 'Friday dinner after class' })).toBeVisible()
})

test('searching My Chats keeps only the matching hangout', async ({ page }) => {
  await page.goto('/chats')
  await page.getByLabel('Search by hangout or person').fill('Saturday')
  await expect(page.getByText('Saturday study session')).toBeVisible()
  await expect(page.getByText('Friday dinner after class')).toHaveCount(0)
})

test('searching My Chats by a member name finds their hangouts', async ({ page }) => {
  await page.goto('/chats')
  await page.getByLabel('Search by hangout or person').fill('Ryan')
  await expect(page.getByText('Friday dinner after class')).toBeVisible()
  await expect(page.getByText('Saturday study session')).toHaveCount(0)
})

test('the Chat button on Friends opens a one to one chat and adds it to My Chats once', async ({
  page,
}) => {
  await page.goto('/login?redirect=/dashboard')
  await page.getByLabel('Email').fill('ryan@example.com')
  await page.getByLabel('Password', { exact: true }).fill('password123')
  await page.getByRole('button', { name: 'Log in', exact: true }).last().click()
  await page.getByRole('navigation').getByRole('link', { name: 'Friends', exact: true }).click()

  await page.getByRole('button', { name: 'Chat with Hugo' }).click()
  await expect(page).toHaveURL('/chats/direct/demo-direct-u-hugo')
  await expect(page.getByRole('heading', { name: 'Hugo' })).toBeVisible()

  // a second click goes to the same chat instead of making another
  await page.getByRole('navigation').getByRole('link', { name: 'Friends', exact: true }).click()
  await page.getByRole('button', { name: 'Chat with Hugo' }).click()
  await expect(page).toHaveURL('/chats/direct/demo-direct-u-hugo')

  await page.getByRole('navigation').getByRole('link', { name: 'Chats', exact: true }).click()
  await expect(page.locator('#chat-list').getByText('Hugo', { exact: true })).toHaveCount(1)
})
