// Owner: Eashvar. Journey test for 11 Group voting and 12 Final plan on the demo hangout: the step
// bar, candidates and group chat show, voting and changing a vote move the tally, a double-click
// counts once, the host closes the vote and lands on the final plan, page 12 opened directly shows
// the leader as not confirmed with the map and weather, "Copy plan" fills the clipboard, and
// "Mark as done" only works once the hangout has started. Starting the vote: on the second sample
// hangout (still collecting) the host starts it and voting opens, the button is blocked once the
// hangout's start time has passed, and someone who isn't in a hangout is told they can't vote.
// Tie-break: a tie after the deadline is settled by spinning the wheel. On a phone (375px) the
// pages fit and every button is at least 44px tall. In the first mock, Ryan (the host, and "me" in
// demo mode) and Hugo voted for Mock Cafe, Nicole for the Board Game Cafe, and Surya hasn't voted.
// The browser clock is fixed before the demo deadline (15 Oct 2026, 9 pm SGT) so voting is open,
// except where a test moves it later.
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

  test('shows the group chat next to the vote', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Group chat' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Group activity' })).toBeVisible()
  })

  test('shows the step bar with Vote as the current step', async ({ page }) => {
    await expect(page.getByText('Friday dinner after class')).toBeVisible()
    await expect(page.getByRole('link', { name: '5 Vote', exact: true })).toHaveAttribute(
      'aria-current',
      'step',
    )
  })

  test('double-clicking a vote only counts it once', async ({ page }) => {
    await voteButton(page, hawker).dblclick()

    await expect(tally(page, hawker)).toHaveAttribute('aria-valuenow', '1')
    await expect(page.getByText('3 of 4 voted')).toBeVisible()
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

  test('shows everyone on a map and the weather for the hangout', async ({ page }) => {
    await page.goto('/hangouts/demo/plan')
    await expect(
      page.getByRole('region', { name: "Map of everyone's starting points" }),
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Weather at Bishan' })).toBeVisible()
    await expect(page.getByText('coming soon')).toBeVisible()
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

  test('Mark as done waits until the hangout has started', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-14T22:00:00+08:00'))
    await page.goto('/hangouts/demo/vote')
    await page.getByRole('button', { name: 'Close vote' }).click()

    await expect(page.getByRole('button', { name: 'Mark as done' })).toBeDisabled()
    await expect(page.getByText('You can mark it done once the hangout has started.')).toBeVisible()
  })

  test('after the hangout starts, the host can mark it done', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-16T21:00:00+08:00'))
    await page.goto('/hangouts/demo/vote')
    await page.getByRole('button', { name: 'Close vote' }).click()

    await page.getByRole('button', { name: 'Mark as done' }).click()

    await expect(page.getByText('✓ Done')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mark as done' })).toBeHidden()
  })
})

test.describe('Changing when voting closes', () => {
  // The demo vote closes Thu 15 Oct, 9 pm; the hangout is Fri 16 Oct, 7 pm
  const card = (page) => page.getByRole('region', { name: 'Voting closes' })

  test('the host can move the closing time while voting is open', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-14T22:00:00+08:00'))
    await page.goto('/hangouts/demo/vote')

    await expect(card(page).getByText('Voting closes Thu, 15 Oct, 9:00 pm SGT.')).toBeVisible()
    await page
      .getByLabel('Change it to')
      .selectOption({ label: 'In 3 hours (Thu, 15 Oct, 1:00 am)' })
    await page.getByRole('button', { name: 'Update closing time' }).click()

    await expect(card(page).getByText('Voting closes Thu, 15 Oct, 1:00 am SGT.')).toBeVisible()
    await expect(page.getByText('Closes in 3h 0m')).toBeVisible()
  })

  test('moving a passed closing time ahead opens voting again', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-15T22:00:00+08:00'))
    await page.goto('/hangouts/demo/vote')

    await expect(card(page).getByText('Voting closed Thu, 15 Oct, 9:00 pm SGT.')).toBeVisible()
    await expect(voteButton(page, hawker)).toBeDisabled()
    await page
      .getByLabel('Open voting again until')
      .selectOption({ label: 'In 1 hour (Thu, 15 Oct, 11:00 pm)' })
    await page.getByRole('button', { name: 'Open voting again' }).click()

    await expect(page.getByText('Closes in 1h 0m')).toBeVisible()
    await expect(voteButton(page, hawker)).toBeEnabled()
  })
})

test.describe('Starting the vote', () => {
  const studyCafe = 'Mock Study Cafe (sample data)'

  test('the host starts the vote, then everyone can vote', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-14T22:00:00+08:00'))
    await page.goto('/hangouts/demo-2/vote')

    await expect(page.getByText('Not started')).toBeVisible()
    await expect(page.getByText("Voting hasn't started yet.", { exact: false })).toBeVisible()
    await expect(voteButton(page, studyCafe)).toBeDisabled()

    await page.getByRole('button', { name: 'Start the vote' }).click()

    await expect(page.getByText('Closes in')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start the vote' })).toBeHidden()
    await voteButton(page, studyCafe).click()
    await expect(tally(page, studyCafe)).toHaveAttribute('aria-valuenow', '1')
    await expect(page.getByRole('button', { name: 'Close vote' })).toBeEnabled()
  })

  test('the host picks when voting closes before starting it', async ({ page }) => {
    // demo-2 starts Sat 24 Oct, 2 pm, and 05 no longer sets a deadline
    await page.clock.setFixedTime(new Date('2026-10-14T22:00:00+08:00'))
    await page.goto('/hangouts/demo-2/vote')

    const closes = page.getByLabel('Voting closes')
    await expect(closes).toHaveValue('2026-10-24T04:00:00.000Z') // 2 hours before, to begin with
    await closes.selectOption({ label: '1 day before the hangout' })
    await expect(page.getByText('Voting will close Fri, 23 Oct, 2:00 pm SGT.')).toBeVisible()

    await page.getByRole('button', { name: 'Start the vote' }).click()
    await expect(page.getByText('Closes in 8d 16h')).toBeVisible()
  })

  test('only closing times still ahead are offered', async ({ page }) => {
    // 3 pm on the Friday: "1 day before" (2 pm) has passed, the rest are still to come
    await page.clock.setFixedTime(new Date('2026-10-23T15:00:00+08:00'))
    await page.goto('/hangouts/demo-2/vote')

    await expect(page.getByLabel('Voting closes').locator('option')).toHaveText([
      '6 hours before the hangout',
      '2 hours before the hangout',
      '1 hour before the hangout',
      'When the hangout starts',
    ])
  })

  test('the vote can’t start once the hangout’s start time has passed', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-25T10:00:00+08:00'))
    await page.goto('/hangouts/demo-2/vote')

    await expect(page.getByRole('button', { name: 'Start the vote' })).toBeDisabled()
    await expect(page.getByText("there's no time left to vote", { exact: false })).toBeVisible()
  })

  test('someone who isn’t in the hangout is told they can’t vote', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-14T22:00:00+08:00'))
    await page.goto('/login?mode=signup')
    await page.getByLabel('Name').fill('Test User')
    await page.getByLabel('Email').fill('test.user@example.test')
    await page.getByLabel('Password', { exact: true }).fill('testpass123')
    await page.getByRole('button', { name: 'Create account' }).click()
    await page.getByRole('link', { name: 'Skip for now' }).click()

    await page
      .locator('.card', { hasText: 'Friday dinner after class' })
      .getByRole('link', { name: 'Friday dinner after class' })
      .click()

    await expect(page.getByText("You're not in this hangout, so you can't vote.")).toBeVisible()
    await expect(voteButton(page, cafe)).toBeDisabled()
  })
})

test.describe('Tie-break wheel', () => {
  test('a tie after voting ends is settled by spinning the wheel', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.clock.install({ time: new Date('2026-10-14T22:00:00+08:00') })
    await page.goto('/hangouts/demo/vote')

    await voteButton(page, hawker).click()
    for (const spot of [cafe, boardGames, hawker]) {
      await expect(tally(page, spot)).toHaveAttribute('aria-valuenow', '1')
    }
    await expect(page.getByRole('button', { name: 'Spin the wheel' })).toBeHidden()

    await page.clock.fastForward('24:00:00')

    const wheel = page.getByRole('region', { name: "It's a tie!" })
    await expect(wheel).toBeVisible()
    await expect(page.getByRole('button', { name: 'Close vote' })).toBeHidden()
    await wheel.getByRole('button', { name: 'Spin the wheel' }).click()

    await expect(wheel.getByText('The wheel picked')).toBeVisible()
    const picked = await wheel.getByText('The wheel picked').locator('strong').textContent()
    expect([cafe, boardGames, hawker]).toContain(picked)

    await wheel.getByRole('link', { name: 'See the final plan' }).click()
    await expect(page.getByText('Confirmed spot')).toBeVisible()
    await expect(page.getByRole('heading', { name: picked, exact: true })).toBeVisible()
  })
})

test.describe('On a phone', () => {
  for (const path of ['/hangouts/demo/vote', '/hangouts/demo-2/vote', '/hangouts/demo/plan']) {
    test(`${path} fits the screen and its buttons are easy to tap`, async ({ page }) => {
      await page.clock.setFixedTime(new Date('2026-10-14T22:00:00+08:00'))
      await page.setViewportSize({ width: 375, height: 812 })
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

      const layout = await page.evaluate(() => ({
        pageWidth: document.documentElement.scrollWidth,
        tooSmall: [...document.querySelectorAll('main button, main .btn, main select')]
          .filter((el) => el.offsetParent !== null)
          .map((el) => ({
            control: el.getAttribute('aria-label') || el.textContent.trim(),
            height: Math.round(el.getBoundingClientRect().height),
          }))
          .filter((c) => c.height < 44),
      }))

      expect(layout.pageWidth).toBeLessThanOrEqual(375)
      expect(layout.tooSmall).toEqual([])
    })
  }
})
