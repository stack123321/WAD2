// Owner: Surya
// "Details" in the step bar (05 in edit mode) and the step bar's Chat on 06.
// Uses the sample hangout (no Supabase keys), where you count as the host and nothing is saved.
import { test, expect } from '@playwright/test'

test('Details in the step bar opens the hangout details, filled in', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/hangouts/demo/transport')
  // wait until the step bar shows we're on Transport, so the link knows where to come back to
  await expect(page.locator('.step.current')).toContainText('Transport')
  await page.getByRole('link', { name: 'Step 0: hangout details' }).click()
  await expect(page).toHaveURL('/hangouts/demo/edit?from=transport')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hangout details')
  await expect(page.getByLabel(/Hangout name/)).toHaveValue('Friday dinner after class')
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible()
})

test('saving new details updates the step bar and goes back to the step', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/hangouts/demo/transport')
  // wait until the step bar shows we're on Transport, so the link knows where to come back to
  await expect(page.locator('.step.current')).toContainText('Transport')
  await page.getByRole('link', { name: 'Step 0: hangout details' }).click()
  await page.getByLabel(/Hangout name/).fill('Renamed dinner')
  await page.locator('input[type=date]').fill('2027-01-15')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page).toHaveURL('/hangouts/demo/transport')
  await expect(page.locator('.hangout-bar')).toContainText('Renamed dinner')
  await expect(page.locator('.hangout-bar')).toContainText('Fri 15 Jan')
})

test('on a phone, ‹ on step 1 goes to the hangout details', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto('/hangouts/demo/start')
  await page.getByRole('link', { name: 'Previous: hangout details' }).click()
  await expect(page).toHaveURL('/hangouts/demo/edit?from=starting-points')
})

test('on 06 the step bar Chat opens the chat panel, and there is no other chat button', async ({
  page,
}) => {
  await page.goto('/hangouts/demo/start')
  await expect(page.locator('.chat-btn')).toHaveCount(0)
  await page.locator('.hangout-bar .chat-link').click()
  await expect(page.locator('#chat-panel')).toBeVisible()
  await expect(page).toHaveURL('/hangouts/demo/start')
})
