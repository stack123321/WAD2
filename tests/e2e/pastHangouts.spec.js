// Owner: Eashvar (testing; from Surya's tests). E2E tests (Week 10c) for "Go again" on past
// hangouts (same group, place and starting points, only a new date). The test finishes the Friday
// sample hangout the way a user would: the host closes the vote (Mock Cafe wins) and marks it
// done, and its debrief then offers Go again. Sample hangouts always reload from their file, so
// the filled-in New hangout form can only be reached with a real (Supabase) hangout; whether a
// hangout can be repeated (finalSpot) has unit tests in src/services/__tests__.
import { test, expect } from '@playwright/test'
import { setTime, HANGOUT_STARTED } from './helpers/clock.js'

const cafe = 'Mock Cafe (sample data)'

// Close the vote and mark the hangout done, which leaves you on 12 Final plan
async function finishTheHangout(page) {
  await setTime(page, HANGOUT_STARTED)
  await page.goto('/hangouts/demo/vote')
  await page.getByRole('button', { name: 'Close vote' }).click()
  await page.getByRole('button', { name: 'Mark as done' }).click()
  await expect(page.getByText('✓ Done')).toBeVisible()
}

test('the debrief offers Go again and a Photos panel', async ({ page }) => {
  await finishTheHangout(page)

  await page.getByRole('link', { name: 'See how it went' }).click()

  await expect(page.getByRole('link', { name: `↻ Go again to ${cafe}` })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Photos' })).toBeVisible()
  // the sample hangout has no database, so the panel explains instead of offering uploads
  await expect(page.getByText('Photos work in real hangouts.')).toBeVisible()
})

test('a hangout that was never decided can’t be repeated', async ({ page }) => {
  await page.goto('/hangouts/new?again=demo')

  await expect(page.getByText('That hangout was never decided')).toBeVisible()
})
