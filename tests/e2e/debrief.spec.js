// Owner: Eashvar. E2E tests (Week 10c) for the debrief on the Friday sample hangout: once the host
// closes the vote and marks the hangout done, 12 links to "How it went", which shows the spot,
// who came and how the vote went, and "Plan another with this group" opens 05 with the others
// ticked. A hangout that hasn't been decided yet gets a note instead.
import { test, expect } from '@playwright/test'
import { setTime, HANGOUT_STARTED } from './helpers/clock.js'

const cafe = 'Mock Cafe (sample data)'

// Close the vote, mark the hangout done, then open its debrief from 12
async function openDebrief(page) {
  await setTime(page, HANGOUT_STARTED)
  await page.goto('/hangouts/demo/vote')
  await page.getByRole('button', { name: 'Close vote' }).click()
  await page.getByRole('button', { name: 'Mark as done' }).click()
  await page.getByRole('link', { name: 'See how it went' }).click()
}

test('a done hangout’s debrief shows the spot, who came and how the vote went', async ({
  page,
}) => {
  await openDebrief(page)

  await expect(page).toHaveURL('/hangouts/demo/debrief')
  await expect(page.getByRole('heading', { name: cafe })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Who came (4)' })).toBeVisible()
  await expect(page.getByText(`${cafe} got the most votes: 2 of 3.`)).toBeVisible()
})

test('"Plan another with this group" ticks everyone else on 05', async ({ page }) => {
  await openDebrief(page)

  await page.getByRole('link', { name: 'Plan another with this group' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('New hangout')
  await expect(page.getByRole('checkbox', { name: 'Nicole', exact: true })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: 'Hugo', exact: true })).toBeChecked()
})

test('a hangout that hasn’t been decided yet has nothing to look back on', async ({ page }) => {
  await page.goto('/hangouts/demo/debrief')

  await expect(page.getByText("This hangout hasn't been decided yet")).toBeVisible()
})
