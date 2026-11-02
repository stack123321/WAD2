// Owner: Eashvar (testing). E2E tests (Week 10c) for 07 Transport on the Friday sample hangout
// (you're Surya, coming from Woodlands by bus): everyone is listed with where they're coming
// from, picking your own mode updates your travel time, "Find our midpoint" saves the fairest
// station and opens 08, and (Ryan) once the midpoint is locked 07 offers to see it instead.
// Travel times come from api/route.js's sample routes, since the tests run without OneMap keys.
// Each row on its own (Remind, whose row can pick) has a component test in
// src/components/transport/__tests__.
import { test, expect } from '@playwright/test'

test('lists everyone with where they’re coming from', async ({ page }) => {
  await page.goto('/hangouts/demo/transport')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('How is everyone getting there?')
  await expect(page.getByText('From Tampines', { exact: false })).toBeVisible()
  await expect(page.getByText('From Punggol', { exact: false })).toBeVisible()
})

test('picking my mode updates my travel time', async ({ page }) => {
  await page.goto('/hangouts/demo/transport')
  await expect(page.getByText('$1.69 one way')).toBeVisible() // my bus fare

  // only my own row's buttons can be clicked, so this is my MRT button
  await page.getByRole('button', { name: 'MRT', disabled: false }).click()

  await expect(page.getByText('$2.05 one way')).toBeVisible() // my MRT fare
  await expect(page.getByText('$1.69 one way')).toBeHidden()
  await expect(page.getByText('4 of 4 have picked how they’re getting there.')).toBeVisible()
})

test('a locked midpoint can be seen from 07 but not found again', async ({ page }) => {
  await page.goto('/hangouts/demo/midpoint')
  await page.getByRole('button', { name: 'Lock midpoint' }).click()
  // the step bar's link, not page.goto, so the sample hangout in the store keeps the lock
  await page
    .getByRole('link', { name: /Transport$/ })
    .first()
    .click()

  await expect(page.getByText('Ryan locked the midpoint at Bishan.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Find our midpoint' })).toHaveCount(0)
  await page.getByRole('link', { name: 'See the midpoint' }).click()
  await expect(page).toHaveURL('/hangouts/demo/midpoint')
})

test('Find our midpoint opens 08', async ({ page }) => {
  await page.goto('/hangouts/demo/transport')

  await page.getByRole('button', { name: 'Find our midpoint' }).click()
  // the sample hangout has spots shortlisted near Bishan, so a different station asks first
  await page.getByRole('dialog').getByRole('button', { name: 'Move midpoint' }).click()

  await expect(page).toHaveURL('/hangouts/demo/midpoint')
})
