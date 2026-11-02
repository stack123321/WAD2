// Owner: Eashvar (testing). E2E tests (Week 10c) for 06 Starting points on the Friday sample
// hangout (here you're Surya, coming from Holland Village): everyone's starting point is listed,
// searching and picking a place changes yours, and a search with no match says what to try.
// Search results come from api/search.js's sample places, since the tests run without OneMap keys.
import { test, expect } from '@playwright/test'

test('lists everyone with where they’re coming from', async ({ page }) => {
  await page.goto('/hangouts/demo/start')

  await expect(page.getByText('Tampines MRT')).toBeVisible()
  await expect(page.getByText('Jurong East MRT')).toBeVisible()
  await expect(page.getByText('Holland Village MRT')).toBeVisible()
  await expect(page.getByText('Punggol MRT')).toBeVisible()
})

test('searching and picking a place changes my starting point', async ({ page }) => {
  await page.goto('/hangouts/demo/start')

  await page.getByRole('combobox').fill('Bishan')
  await page.getByRole('option', { name: /Bishan MRT/ }).click()

  // my row shows the place's name and its address, which are both "Bishan MRT (sample)"
  await expect(page.getByText('Bishan MRT (sample)').first()).toBeVisible()
  await expect(page.getByText('Holland Village MRT')).toBeHidden()
})

test('a search with no match says what to try instead', async ({ page }) => {
  await page.goto('/hangouts/demo/start')

  await page.getByRole('combobox').fill('zzzz')

  await expect(
    page.getByText('No places match "zzzz". Try an MRT name or a 6-digit postal code.'),
  ).toBeVisible()
})
