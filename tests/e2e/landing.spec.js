// Owner: Eashvar (testing). E2E tests (Week 10c) for 01 Landing, logged out: the hero's button
// starts a hangout, "How it works" and the FAQ are there, a question opens to show its answer,
// "Log in" in the navbar opens the log in page, and the hero map shows you and three friends
// with their trip times. Runs without Supabase keys.
import { test, expect } from '@playwright/test'

test('the hero button starts a new hangout', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Meet halfway.')

  await page.getByRole('link', { name: 'Start a hangout' }).first().click()

  await expect(page).toHaveURL('/hangouts/new')
})

test('explains how it works and answers common questions', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'How it works' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Questions? We’ve got answers.' })).toBeVisible()
})

test('a question in the FAQ opens to show its answer', async ({ page }) => {
  await page.goto('/')
  const answer = page.getByText('Yes. Make an account and start planning straight away.')
  await expect(answer).toBeHidden()

  await page.getByRole('button', { name: 'Is Fairpoint free?' }).click()

  await expect(answer).toBeVisible()
})

test('Log in in the navbar opens the log in page', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('link', { name: 'Log in' }).first().click()

  await expect(page).toHaveURL('/login')
})

test('the hero map shows you and three friends with their trip times', async ({ page }) => {
  await page.goto('/')
  const map = page.getByRole('img', { name: /you and three friends meeting at a fair midpoint/ })

  await expect(map.getByText('You', { exact: true })).toBeVisible()
  await expect(map.getByText('Fair for everyone')).toBeVisible()
  await expect(map.getByText('18 min', { exact: true })).toBeVisible()
  await expect(map.getByText('22 min', { exact: true })).toBeVisible()
})
