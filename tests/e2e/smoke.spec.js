// Owner: Eashvar (testing lead). Smoke test (Week 10c): every page opens with the right heading,
// and the two main journeys click through: making a new hangout from the landing page to the
// final plan, and signing up to My hangouts. Runs without Supabase keys, so the app uses the
// sample hangouts and any email and password signs up.
import { test, expect } from '@playwright/test'
import { signUp, skipOnboarding } from './helpers/onboarding.js'

const pages = [
  ['/', 'Meet halfway.'],
  ['/login', 'Stop arguing about where to meet.'],
  ['/preferences', 'Tell us what you like'],
  ['/dashboard', 'Good'],
  ['/chats', 'My Chats'],
  ['/hangouts/new', 'New hangout'],
  ['/hangouts/demo/start', 'Where is everyone coming from?'],
  ['/hangouts/demo/transport', 'How is everyone getting there?'],
  ['/hangouts/demo/midpoint', 'Midpoint'],
  ['/hangouts/demo/explore', 'Spots near Bishan'],
  ['/hangouts/demo/vote', 'Group voting'],
  ['/hangouts/demo/plan', 'Final plan & itinerary'],
]

for (const [path, title] of pages) {
  test(`opens ${path}`, async ({ page }) => {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(title)
  })
}

test('new hangout: from the landing page to the final plan', async ({ page }) => {
  const h1 = page.getByRole('heading', { level: 1 })
  await page.goto('/')

  await page.getByRole('link', { name: 'Start a hangout' }).first().click()
  await expect(h1).toHaveText('New hangout')
  await page.getByLabel('Hangout name').fill('Smoke test hangout')
  await page.getByLabel('Date').fill('2030-01-15')
  await page.getByLabel('Time').fill('19:00')
  await page.getByRole('button', { name: 'Create & add starting points' }).click()
  await expect(h1).toHaveText('Where is everyone coming from?')

  await page.getByRole('link', { name: 'Next: choose transport' }).click()
  await expect(h1).toHaveText('How is everyone getting there?')
  await page.getByRole('button', { name: 'Find our midpoint' }).click()
  // the sample hangout has spots shortlisted near Bishan, so a different station asks first
  await page.getByRole('dialog').getByRole('button', { name: 'Move midpoint' }).click()
  await expect(h1).toHaveText('Midpoint')
  await page.getByRole('link', { name: 'See nearby spots' }).click()
  await expect(h1).toContainText('Spots near')

  await page.goto('/hangouts/demo/vote')
  await page.getByRole('button', { name: 'Close vote' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click()
  await expect(h1).toHaveText('Final plan & itinerary')
})

test('sign up: from the log in page to My hangouts', async ({ page }) => {
  await signUp(page, { email: 'test@example.test' })
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tell us what you like')

  await skipOnboarding(page)

  await expect(page).toHaveURL('/dashboard')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Test User')
})
