// Owner: Eashvar (testing lead). Smoke test: every page opens, and the main flow can be
// clicked through from 01 to 12 using the demo hangout. Each user journey has its own spec
// with deeper checks (e.g. voting.spec.js).
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
  // TODO(Hugo): page 10's <h1> will be the spot's name, so for now only check that it has one
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

// Each step: [role, accessible name] of the thing to click, then the <h1> of the page it opens.
// Clicking by name (not "the only link in <section>") keeps working when a page has several
// links and buttons, like 11 Group voting, where the next step is the host's "Close vote" button.
const flowTo10 = [
  ['link', 'Sign up', 'Log in / Sign up'],
  ['link', 'Continue', 'User preferences'],
  ['link', 'Save and continue', 'My hangouts'],
  ['link', 'New hangout', 'Create hangout & invite'],
  ['link', 'Create', 'Starting points'],
  ['link', 'Next', 'Mode of transport'],
  ['link', 'Find midpoint', 'Midpoint + crowd heat map'],
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

  // TODO(Hugo): page 10 has no link to the vote page yet, so go there directly.
  // Swap this for a click once SpotDetailsView links to { name: 'vote' }.
  await page.goto('/hangouts/demo/vote')
  await expect(h1).toHaveText('Group voting')

  // In demo mode "me" is the host, so the Close vote button is there
  await page.getByRole('button', { name: 'Close vote' }).click()
  await expect(h1).toHaveText('Final plan & itinerary')
})
