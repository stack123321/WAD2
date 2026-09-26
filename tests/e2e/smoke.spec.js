// Owner: Eashvar (testing lead). Smoke test: every page opens, and the main flow can be
// clicked through from 01 to 12 using the demo hangout. Add one spec per user journey later.
import { test, expect } from '@playwright/test'

const pages = [
  ['/', 'Landing'],
  ['/login', 'Log in / Sign up'],
  ['/preferences', 'User preferences'],
  ['/dashboard', 'My hangouts'],
  ['/hangouts/new', 'Create hangout & invite'],
  ['/hangouts/demo/start', 'Starting points'],
  ['/hangouts/demo/transport', 'Mode of transport'],
  ['/hangouts/demo/midpoint', 'Midpoint + crowd heat map'],
  ['/hangouts/demo/explore', 'Nearby cafes & activities'],
  ['/hangouts/demo/spots/demo-spot-1', 'Spot details'],
  ['/hangouts/demo/vote', 'Group voting'],
  ['/hangouts/demo/plan', 'Final plan & itinerary'],
]

for (const [path, title] of pages) {
  test(`opens ${path}`, async ({ page }) => {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
  })
}

test('main flow clicks through from landing to final plan', async ({ page }) => {
  await page.goto('/')
  // Each page's main button leads to the next page in the flow
  for (const [, title] of pages.slice(1)) {
    await page.locator('section').getByRole('link').click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
  }
})
