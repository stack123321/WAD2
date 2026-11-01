// Owner: Eashvar. Journey test for the debrief on the demo hangout: once the host closes the vote
// and marks the hangout done, 12 links to "How it went", which shows the spot, who came, how fair the
// trips were and the final vote, and "Plan another with this group" opens 05 with the others ticked.
// A hangout that hasn't been decided yet gets a note instead. Runs without Supabase keys.
import { test, expect } from '@playwright/test'

const cafe = 'Mock Cafe (sample data)'
const boardGames = 'Mock Board Game Cafe (sample data)'

// The demo hangout is on Fri 16 Oct, 7 pm: by 9 pm it has started and voting has closed
async function finishTheHangout(page) {
  await page.clock.setFixedTime(new Date('2026-10-16T21:00:00+08:00'))
  await page.goto('/hangouts/demo/vote')
  await page.getByRole('button', { name: 'Close vote' }).click()
  await page.getByRole('button', { name: 'Mark as done' }).click()
  await expect(page.getByText('✓ Done')).toBeVisible()
}

test('a done hangout links from the final plan to its debrief', async ({ page }) => {
  await finishTheHangout(page)
  await page.getByRole('link', { name: 'See how it went' }).click()

  await expect(page).toHaveURL('/hangouts/demo/debrief')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('How it went')
  await expect(page.getByText('Done', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: cafe, exact: true })).toBeVisible()
  await expect(page.getByText("Everyone's trip was within 9 min of each other.")).toBeVisible()
})

test('the debrief shows who came and how the vote went', async ({ page }) => {
  await finishTheHangout(page)
  await page.getByRole('link', { name: 'See how it went' }).click()

  await expect(page.getByRole('heading', { name: 'Who came (4)' })).toBeVisible()
  await expect(page.getByText(`${cafe} got the most votes: 2 of 3.`)).toBeVisible()
  await expect(page.getByRole('progressbar', { name: cafe, exact: true })).toHaveAttribute(
    'aria-valuenow',
    '2',
  )
  await expect(page.getByText('Picked')).toBeVisible()
  await expect(page.getByText(`Runner-up: ${boardGames}`)).toBeVisible()
})

test('"Plan another with this group" ticks everyone else on 05', async ({ page }) => {
  await finishTheHangout(page)
  await page.getByRole('link', { name: 'See how it went' }).click()
  await page.getByRole('link', { name: 'Plan another with this group' }).click()

  await expect(page).toHaveURL(/\/hangouts\/new\?with=/)
  for (const name of ['Nicole', 'Hugo']) {
    await expect(page.getByRole('checkbox', { name, exact: true })).toBeChecked()
  }
})

test('a hangout that hasn’t been decided yet has nothing to look back on', async ({ page }) => {
  await page.goto('/hangouts/demo/debrief')

  await expect(page.getByText("This hangout hasn't been decided yet")).toBeVisible()
  await expect(page.getByRole('link', { name: 'See the plan' })).toHaveAttribute(
    'href',
    '/hangouts/demo/plan',
  )
})

test('on a phone the debrief fits the screen and its buttons are easy to tap', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await finishTheHangout(page)
  await page.getByRole('link', { name: 'See how it went' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('How it went')

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
  for (const button of await page.locator('main .btn').all()) {
    const box = await button.boundingBox()
    expect(box.height).toBeGreaterThanOrEqual(44)
  }
})
