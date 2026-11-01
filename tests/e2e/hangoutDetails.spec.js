// Owner: Eashvar (testing; from Surya's tests). E2E tests (Week 10c) for "Details" in the step bar
// (05 in edit mode) on the Friday sample hangout, where you count as the host and nothing is
// saved: it opens the details filled in, and saving goes back to the step with the new name and
// date in the step bar.
import { test, expect } from '@playwright/test'

// Open 07 Transport, then the step bar's "Step 0: hangout details"
async function openDetailsFromTransport(page) {
  await page.goto('/hangouts/demo/transport')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('How is everyone getting there?')
  await page.getByRole('link', { name: 'Step 0: hangout details' }).click()
}

test('Details in the step bar opens the hangout details, filled in', async ({ page }) => {
  await openDetailsFromTransport(page)

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hangout details')
  await expect(page.getByLabel(/Hangout name/)).toHaveValue('Friday dinner after class')
})

test('saving new details goes back to the step and shows them in the step bar', async ({
  page,
}) => {
  await openDetailsFromTransport(page)
  await page.getByLabel(/Hangout name/).fill('Renamed dinner')
  await page.getByLabel('Date').fill('2027-01-15')

  await page.getByRole('button', { name: 'Save changes' }).click()

  await expect(page).toHaveURL('/hangouts/demo/transport')
  await expect(page.getByText('Renamed dinner')).toBeVisible()
  await expect(page.getByText('Fri 15 Jan', { exact: false })).toBeVisible()
})
