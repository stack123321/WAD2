// Owner: Eashvar (testing; from Ryan's tests). E2E tests (Week 10c) for 04 My hangouts with the two
// sample hangouts (Friday 16 Oct, voting; Saturday 24 Oct, still collecting): each shows its
// progress, a card opens its next step, a hangout can be pinned and unpinned, one whose date has
// passed moves to Past, and My Friends in the navbar opens the friends page. Which step a card
// opens, the day headings and the countdown have unit tests in src/utils/__tests__, and the
// "Needs your input" card has a component test.
import { test, expect } from '@playwright/test'
import { setTime, VOTING_OPEN } from './helpers/clock.js'

const friday = 'Friday dinner after class'
const saturday = 'Saturday study session'

test('shows both sample hangouts and how far along they are', async ({ page }) => {
  await setTime(page, VOTING_OPEN)
  await page.goto('/dashboard')

  await expect(page.getByRole('heading', { name: friday })).toBeVisible()
  await expect(page.getByRole('heading', { name: saturday })).toBeVisible()
  await expect(page.getByText('Waiting on Surya')).toBeVisible()
})

test('clicking a hangout opens its next step', async ({ page }) => {
  await setTime(page, VOTING_OPEN)
  await page.goto('/dashboard')

  await page.getByRole('link', { name: friday }).click()

  await expect(page).toHaveURL('/hangouts/demo/vote')
})

test('a hangout can be pinned to the top and unpinned again', async ({ page }) => {
  await setTime(page, VOTING_OPEN)
  await page.goto('/dashboard')

  await page.getByRole('button', { name: `More options for ${saturday}` }).click()
  await page.getByRole('button', { name: 'Pin to top' }).click()
  await expect(page.getByRole('heading', { name: /PINNED/ })).toBeVisible()

  await page.getByRole('button', { name: `More options for ${saturday}` }).click()
  await page.getByRole('button', { name: 'Unpin' }).click()
  await expect(page.getByRole('heading', { name: /PINNED/ })).toBeHidden()
})

test('a hangout whose date has passed moves to Past', async ({ page }) => {
  await setTime(page, '2026-10-20T10:00:00+08:00') // after Friday 16 Oct, before Saturday 24 Oct
  await page.goto('/dashboard')
  await expect(page.getByText(friday)).toBeHidden()
  await expect(page.getByText(saturday)).toBeVisible()

  await page.getByRole('button', { name: 'Past' }).click()

  await expect(page.getByText(friday)).toBeVisible()
})

test('My Friends in the navbar opens the friends page', async ({ page }) => {
  await page.goto('/login?redirect=/dashboard')
  await page.getByLabel('Email').fill('ryan@example.test')
  await page.getByLabel('Password', { exact: true }).fill('testpass123')
  await page.getByRole('button', { name: 'Log in', exact: true }).last().click()
  await expect(page).toHaveURL('/dashboard')

  await page
    .getByRole('navigation')
    .getByRole('link', { name: /^Friends/ })
    .click()

  await expect(page).toHaveURL('/friends')
})
