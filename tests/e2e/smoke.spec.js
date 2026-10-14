// Owner: Eashvar (testing lead). Smoke test: every page opens with the right <h1>, and the main
// flow clicks through from 01 to 12 on the demo hangout, finding each step's link or button by
// its accessible name. TODO(Hugo): page 10 has no fixed <h1> or link to the vote page yet, so its
// title is only checked for any text and the flow jumps straight to /hangouts/demo/vote.
import { test, expect } from '@playwright/test'

const pages = [
  ['/', 'Landing'],
  ['/login', 'Log in / Sign up'],
  ['/preferences', 'User preferences'],
  ['/dashboard', /^Good (morning|afternoon|evening)(, .+)?!$/],
  ['/hangouts/new', 'Create hangout & invite'],
  ['/hangouts/demo/start', 'Where is everyone coming from?'],
  ['/hangouts/demo/transport', 'How is everyone getting there?'],
  ['/hangouts/demo/midpoint', 'Midpoint + crowd heat map'],
  ['/hangouts/demo/explore', 'Nearby cafes & activities'],
  ['/hangouts/demo/spots/demo-spot-1', /\S/],
  ['/hangouts/demo/vote', 'Group voting'],
  ['/hangouts/demo/plan', 'Final plan & itinerary'],
]

for (const [path, title] of pages) {
  test(`opens ${path}`, async ({ page }) => {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
  })
}

const flowTo10 = [
  ['link', 'Sign up', 'Log in / Sign up'],
  ['link', 'Continue', 'User preferences'],
  ['link', 'Save and continue', /^Good (morning|afternoon|evening)(, .+)?!$/],
  ['link', 'Start planning', 'Create hangout & invite'],
  ['link', 'Create', 'Where is everyone coming from?'],
  ['link', 'Next', 'How is everyone getting there?'],
  ['link', 'Find our midpoint', 'Midpoint + crowd heat map'],
  ['link', 'See nearby spots', 'Nearby cafes & activities'],
  ['link', 'Open a spot', /\S/],
]

test('main flow clicks through from landing to final plan', async ({ page }) => {
  const h1 = page.getByRole('heading', { level: 1 })
  await page.goto('/')

  for (const [role, name, title] of flowTo10) {
    await page.getByRole(role, { name }).click()
    await expect(h1).toHaveText(title)
  }

  await page.goto('/hangouts/demo/vote')
  await expect(h1).toHaveText('Group voting')

  await page.getByRole('button', { name: 'Close vote' }).click()
  await expect(h1).toHaveText('Final plan & itinerary')
})
