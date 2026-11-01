// Owner: Eashvar. E2E tests (Week 10c) for two different groups: the two sample hangouts
// (src/mocks/hangout.json, voting, and hangout-2.json, still collecting) have different people,
// with Hugo in both. Moving between them in the app must never mix their spots or votes.
import { test, expect } from '@playwright/test'
import { setTime, VOTING_OPEN } from './helpers/clock.js'

const friday = 'Friday dinner after class'
const saturday = 'Saturday study session'

test('My hangouts lists both hangouts with their own progress', async ({ page }) => {
  await setTime(page, VOTING_OPEN)
  await page.goto('/dashboard')

  await expect(page.getByRole('heading', { name: friday })).toBeVisible()
  await expect(page.getByRole('heading', { name: saturday })).toBeVisible()
  await expect(page.getByText('Waiting on Surya')).toBeVisible()
})

test('moving from one hangout’s vote to the other shows only that group’s spots', async ({
  page,
}) => {
  await setTime(page, VOTING_OPEN)
  await page.goto('/dashboard')
  await page.getByRole('link', { name: friday }).click()
  await page.getByRole('link', { name: '5 Vote', exact: true }).click()
  await expect(page.getByText('3 of 4 voted')).toBeVisible()

  await page.goto('/dashboard')
  await page.getByRole('link', { name: saturday }).click()
  await page.getByRole('link', { name: '5 Vote', exact: true }).click()

  await expect(page).toHaveURL('/hangouts/demo-2/vote')
  await expect(page.getByText('0 of 3 voted')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Mock Study Cafe (sample data)' })).toBeVisible()
  await expect(page.getByText('Mock Hawker Centre (sample data)')).toBeHidden()
})
