// Owner: Eashvar. Journey test for 11 Group voting and 12 Final plan on the demo hangout: the
// candidates and turnout show, voting and changing a vote move the tally, the host closes the vote
// and lands on the final plan, page 12 opened directly shows the leader as not confirmed, and
// "Copy plan" fills the clipboard. In the mock, Ryan (the host, and "me" in demo mode) and Hugo
// voted for Mock Cafe, Nicole for the Board Game Cafe, and Surya hasn't voted. The browser clock is
// fixed before the demo deadline (15 Oct 2026, 9 pm SGT) so voting is always open.
import { test, expect } from '@playwright/test'

const cafe = 'Mock Cafe (sample data)'
const boardGames = 'Mock Board Game Cafe (sample data)'
const hawker = 'Mock Hawker Centre (sample data)'

const voteButton = (page, spot) =>
  page.getByRole('button', { name: `Vote for ${spot}`, exact: true })
const tally = (page, spot) => page.getByRole('progressbar', { name: spot, exact: true })

test.describe('11 Group voting', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-14T22:00:00+08:00'))
    await page.goto('/hangouts/demo/vote')
  })

  test('shows the three candidates and how many have voted', async ({ page }) => {
    for (const spot of [cafe, boardGames, hawker]) {
      await expect(page.getByRole('heading', { name: spot, exact: true })).toBeVisible()
    }
    await expect(page.getByText('3 of 4 voted')).toBeVisible()
    await expect(page.getByText('Waiting on Surya')).toBeVisible()
  })

  test('voting for a spot updates its tally', async ({ page }) => {
    await expect(tally(page, hawker)).toHaveAttribute('aria-valuenow', '0')

    await voteButton(page, hawker).click()

    await expect(tally(page, hawker)).toHaveAttribute('aria-valuenow', '1')
    await expect(voteButton(page, hawker)).toHaveAttribute('aria-pressed', 'true')
    await expect(tally(page, cafe)).toHaveAttribute('aria-valuenow', '1')
  })

  test('changing my vote moves the count to the new spot', async ({ page }) => {
    await voteButton(page, hawker).click()
    await expect(tally(page, hawker)).toHaveAttribute('aria-valuenow', '1')

    await voteButton(page, boardGames).click()

    await expect(tally(page, boardGames)).toHaveAttribute('aria-valuenow', '2')
    await expect(tally(page, hawker)).toHaveAttribute('aria-valuenow', '0')
    await expect(voteButton(page, hawker)).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByText('3 of 4 voted')).toBeVisible()
    await expect(page.getByText(`You changed your vote to ${boardGames}`)).toBeVisible()
  })

  test('the host closes the vote and lands on the final plan', async ({ page }) => {
    await voteButton(page, boardGames).click()
    await expect(page.getByLabel('Winner')).toHaveValue('demo-spot-2')

    await page.getByRole('button', { name: 'Close vote' }).click()

    await expect(page).toHaveURL(/\/hangouts\/demo\/plan$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Final plan & itinerary')
    await expect(page.getByRole('heading', { name: boardGames, exact: true })).toBeVisible()
    await expect(page.getByText('Confirmed spot')).toBeVisible()
    await expect(page.getByText('Not confirmed yet')).toBeHidden()
  })
})

test.describe('12 Final plan', () => {
  test('opened directly, it shows the current leader as not confirmed yet', async ({ page }) => {
    await page.goto('/hangouts/demo/plan')
    await expect(page.getByRole('heading', { name: cafe, exact: true })).toBeVisible()
    await expect(page.getByText('Not confirmed yet')).toBeVisible()
    await expect(page.getByText("Everyone's trip is within 9 min of each other.")).toBeVisible()
  })

  test('copy plan puts a summary on the clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/hangouts/demo/plan')

    await page.getByRole('button', { name: 'Copy plan' }).click()

    await expect(page.getByText('Plan copied')).toBeVisible()
    const copied = await page.evaluate(() => navigator.clipboard.readText())
    expect(copied).toContain(`Where: ${cafe}, Bishan`)
    expect(copied).toContain('- Ryan: 6:26 pm (34 min by MRT)')
  })
})
