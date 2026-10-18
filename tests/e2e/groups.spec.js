// Owner: Eashvar. Different groups: the two sample hangouts (src/mocks/hangout.json, voting,
// and hangout-2.json, still collecting) have different people, with Hugo in both. Switching
// between them inside the app must never mix their spots, members or votes, and once the host
// starts the second group's vote, it can't be closed until someone has voted.
import { test, expect } from '@playwright/test'

const friday = 'Friday dinner after class'
const saturday = 'Saturday study session'

const card = (page, hangoutName) => page.locator('.card', { hasText: hangoutName })

async function openSaturdayVote(page) {
  await card(page, saturday).getByRole('link', { name: 'Continue' }).click()
  await page.getByRole('link', { name: '5 Vote', exact: true }).click()
  await expect(page).toHaveURL('/hangouts/demo-2/vote')
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-14T22:00:00+08:00'))
  await page.goto('/dashboard')
})

test('the dashboard lists both hangouts with their own people', async ({ page }) => {
  await expect(page.getByRole('heading', { name: friday })).toBeVisible()
  await expect(page.getByRole('heading', { name: saturday })).toBeVisible()
  await expect(page.getByText('Voting · 3 of 4 voted')).toBeVisible()
  await expect(page.getByText('Locations · 3 of 3 added')).toBeVisible()
})

test('switching hangouts shows only that group’s spots, people and votes', async ({ page }) => {
  await card(page, friday).getByRole('link', { name: 'Open vote' }).click()
  await expect(page.getByText(friday)).toBeVisible()
  await expect(page.getByText('3 of 4 voted')).toBeVisible()
  await page.getByRole('button', { name: 'Vote for Mock Hawker Centre (sample data)' }).click()
  await expect(
    page.getByRole('progressbar', { name: 'Mock Hawker Centre (sample data)' }),
  ).toHaveAttribute('aria-valuenow', '1')

  await page.goto('/dashboard')
  await openSaturdayVote(page)

  await expect(page.getByText(saturday)).toBeVisible()
  await expect(page.getByText(friday)).toBeHidden()
  await expect(page.getByRole('button', { name: /^Vote for / })).toHaveCount(2)
  await expect(page.getByRole('heading', { name: 'Mock Study Cafe (sample data)' })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Mock Public Library (sample data)' }),
  ).toBeVisible()
  await expect(page.getByText('Mock Hawker Centre (sample data)')).toBeHidden()
  await expect(page.getByText('0 of 3 voted')).toBeVisible()
  await expect(page.getByText('Not started')).toBeVisible()
})

test('once started, a vote nobody has voted in can’t be closed', async ({ page }) => {
  await openSaturdayVote(page)
  await page.getByRole('button', { name: 'Start the vote' }).click()

  await expect(page.getByRole('button', { name: 'Close vote' })).toBeDisabled()
  await expect(page.getByText('Wait for at least one vote before closing.')).toBeVisible()
})

test('each hangout’s final plan lists only its own members', async ({ page }) => {
  await page.goto('/hangouts/demo-2/plan')

  await expect(
    page.getByRole('heading', { name: 'Mock Public Library (sample data)' }),
  ).toBeVisible()
  for (const name of ['Eashvar', 'Matrix', 'Hugo']) {
    await expect(page.getByRole('rowheader', { name: new RegExp(`^${name}`) })).toBeVisible()
  }
  for (const name of ['Ryan', 'Nicole', 'Surya']) {
    await expect(page.getByRole('rowheader', { name: new RegExp(`^${name}`) })).toBeHidden()
  }
})
