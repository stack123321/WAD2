// Owner: Eashvar (testing lead). Smoke test: every page opens with the right <h1>, a new user can
// sign up and create a hangout (01 → 06), and a member can go through the planning steps on the
// demo hangout (06 → 12), finding links, buttons and fields by their accessible names. Runs without
// Supabase keys, so sign up is the pretend login and no account is made. The journey is split at 06
// because the pretend user isn't a member of the demo hangout, so 06 can't continue for them.
// TODO(Hugo): page 10 has no link to the vote page yet, so the flow jumps to /hangouts/demo/vote.
import { test, expect } from '@playwright/test'

const pages = [
  ['/', /^Meet halfway\.\s*Hang out better\.$/],
  ['/login', 'Stop arguing about where to meet.'],
  ['/preferences', 'Tell us what you like'],
  ['/dashboard', /^Good (morning|afternoon|evening)(, .+)?!$/],
  ['/hangouts/new', 'New hangout'],
  ['/hangouts/demo/start', 'Where is everyone coming from?'],
  ['/hangouts/demo/transport', 'How is everyone getting there?'],
  ['/hangouts/demo/midpoint', 'Midpoint + crowd heat map'],
  ['/hangouts/demo/explore', 'Spots near Bishan'],
  ['/hangouts/demo/spots/1', 'Mock Cafe'],
  ['/hangouts/demo/vote', 'Group voting'],
  ['/hangouts/demo/plan', 'Final plan & itinerary'],
]

for (const [path, title] of pages) {
  test(`opens ${path}`, async ({ page }) => {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
  })
}

test('Start a hangout on the landing page opens 05', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Start a hangout' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('New hangout')
})

test('a new user signs up and creates a hangout (01 → 06)', async ({ page }) => {
  const h1 = page.getByRole('heading', { level: 1 })
  await page.goto('/')

  await page.getByRole('link', { name: 'Log in' }).click()
  await expect(h1).toHaveText('Stop arguing about where to meet.')

  await page.getByRole('tab', { name: 'Sign up' }).click()
  await page.getByLabel('Name').fill('Test User')
  await page.getByLabel('Email').fill('test.user@example.com')
  await page.getByLabel('Password', { exact: true }).fill('test-password')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(h1).toHaveText('Tell us what you like')

  await page.getByRole('button', { name: 'Save preferences' }).click()
  await expect(h1).toHaveText(/^Good (morning|afternoon|evening)(, .+)?!$/)

  await page.getByRole('link', { name: 'Start planning' }).click()
  await expect(h1).toHaveText('New hangout')

  await page.getByLabel('Hangout name').fill('Smoke test hangout')
  await page.getByLabel('Date').fill(`${new Date().getFullYear() + 1}-06-01`)
  await page.getByRole('button', { name: 'Create & add starting points' }).click()
  await expect(h1).toHaveText('Where is everyone coming from?')
})

test('a member goes through the planning steps (06 → 12)', async ({ page }) => {
  const h1 = page.getByRole('heading', { level: 1 })
  await page.goto('/hangouts/demo/start')
  await expect(h1).toHaveText('Where is everyone coming from?')

  await page.getByRole('link', { name: 'Next' }).click()
  await expect(h1).toHaveText('How is everyone getting there?')

  await page.getByRole('link', { name: 'Find our midpoint' }).click()
  await expect(h1).toHaveText('Midpoint + crowd heat map')

  await page.getByRole('link', { name: 'See nearby spots' }).click()
  await expect(h1).toHaveText('Spots near Bishan')

  await page.getByRole('link', { name: 'Mock Cafe', exact: true }).click()
  await expect(h1).toHaveText('Mock Cafe')

  await page.goto('/hangouts/demo/vote')
  await expect(h1).toHaveText('Group voting')

  await page.getByRole('button', { name: 'Close vote' }).click()
  await expect(h1).toHaveText('Final plan & itinerary')
})
