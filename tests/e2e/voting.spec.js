// Owner: Eashvar. E2E tests (Week 10c) for 11 Group voting and 12 Final plan, one per thing a
// person does there, on the sample hangouts. In the Friday sample (demo), Ryan (the host, and
// "me" in demo mode) and Hugo voted for Mock Cafe, Nicole for the Board Game Cafe, and Surya
// hasn't voted. The vote counting itself (ties, the leader) has unit tests in
// src/components/voting/__tests__.
import { test, expect } from '@playwright/test'
import {
  setTime,
  startClockAt,
  moveTimeForward,
  VOTING_OPEN,
  HANGOUT_STARTED,
} from './helpers/clock.js'
import { signUp, skipOnboarding } from './helpers/onboarding.js'

const cafe = 'Mock Cafe (sample data)'
const hawker = 'Mock Hawker Centre (sample data)'

test('a member changes their vote to another spot', async ({ page }) => {
  await setTime(page, VOTING_OPEN)
  await page.goto('/hangouts/demo/vote')
  await expect(page.getByText('3 of 4 voted')).toBeVisible()

  await page.getByRole('button', { name: `Vote for ${hawker}` }).click()

  await expect(page.getByRole('button', { name: `Vote for ${hawker}` })).toHaveText('✓ Your vote')
  await expect(page.getByText(`You changed your vote to ${hawker}`)).toBeVisible()
  await expect(page.getByText('3 of 4 voted')).toBeVisible()
})

test('the host closes the vote and the final plan shows the winner', async ({ page }) => {
  await setTime(page, VOTING_OPEN)
  await page.goto('/hangouts/demo/vote')

  await page.getByRole('button', { name: 'Close vote' }).click()

  await expect(page).toHaveURL('/hangouts/demo/plan')
  await expect(page.getByText('Confirmed spot')).toBeVisible()
  await expect(page.getByRole('heading', { name: cafe })).toBeVisible()
})

test('the host starts the vote, then members can vote', async ({ page }) => {
  // the Saturday sample (demo-2) is still collecting starting points
  await setTime(page, VOTING_OPEN)
  await page.goto('/hangouts/demo-2/vote')
  await expect(page.getByText("Voting hasn't started yet.", { exact: false })).toBeVisible()

  await page.getByRole('button', { name: 'Start the vote' }).click()
  await page.getByRole('button', { name: 'Vote for Mock Study Cafe (sample data)' }).click()

  await expect(page.getByText('Closes in', { exact: false })).toBeVisible()
  await expect(page.getByText('1 of 3 voted')).toBeVisible()
})

test('someone who isn’t in the hangout is told they can’t vote', async ({ page }) => {
  await setTime(page, VOTING_OPEN)
  await signUp(page)
  await skipOnboarding(page)

  await page.getByRole('link', { name: 'Friday dinner after class' }).click()

  await expect(page.getByText("You're not in this hangout, so you can't vote.")).toBeVisible()
  await expect(page.getByRole('button', { name: `Vote for ${cafe}` })).toBeDisabled()
})

test('a tie when voting ends is settled by spinning the wheel', async ({ page }) => {
  await startClockAt(page, VOTING_OPEN)
  await page.goto('/hangouts/demo/vote')

  // moving my vote to the hawker centre makes it 1 vote each
  await page.getByRole('button', { name: `Vote for ${hawker}` }).click()
  await expect(page.getByText(`You changed your vote to ${hawker}`)).toBeVisible()
  await moveTimeForward(page, 24) // past the deadline

  await page.getByRole('button', { name: 'Spin the wheel' }).click()

  // the wheel spins for about 3 seconds before it picks
  await expect(page.getByText('The wheel picked')).toBeVisible({ timeout: 10000 })
  await page.getByRole('link', { name: 'See the final plan' }).first().click()
  await expect(page.getByText('Confirmed spot')).toBeVisible()
})

test('before the vote closes, the final plan shows the leader as not confirmed', async ({
  page,
}) => {
  await setTime(page, VOTING_OPEN)
  await page.goto('/hangouts/demo/plan')

  await expect(page.getByRole('heading', { name: cafe })).toBeVisible()
  await expect(page.getByText('Not confirmed yet')).toBeVisible()
})

test('once the hangout has started, the host can mark it done', async ({ page }) => {
  await setTime(page, HANGOUT_STARTED)
  await page.goto('/hangouts/demo/vote')
  await page.getByRole('button', { name: 'Close vote' }).click()

  await page.getByRole('button', { name: 'Mark as done' }).click()

  await expect(page.getByText('✓ Done')).toBeVisible()
})

test('page 12 shows how fair everyone’s trip is', async ({ page }) => {
  await setTime(page, VOTING_OPEN)
  await page.goto('/hangouts/demo/plan')

  await expect(page.getByText("Everyone's trip is within 9 min of each other.")).toBeVisible()
})
