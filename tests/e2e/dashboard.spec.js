// Owner: Ryan. Page 04 My hangouts, using the demo hangout (sample data, no Supabase keys needed).
import { test, expect } from '@playwright/test'

test('shows the demo hangout with its voting status', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: 'Friday dinner after class' })).toBeVisible()
  await expect(page.getByText('7:00 pm · Midpoint: Bishan · 4 friends')).toBeVisible()
  await expect(page.getByText('Voting · 3 of 4 voted')).toBeVisible()
})

test('Past shows an empty message, Upcoming brings the card back', async ({ page }) => {
  await page.goto('/dashboard')
  await page.getByRole('button', { name: 'Past' }).click()
  await expect(page.getByText('No past hangouts yet.')).toBeVisible()
  await page.getByRole('button', { name: 'Upcoming' }).click()
  await expect(page.getByRole('heading', { name: 'Friday dinner after class' })).toBeVisible()
})

test('Open vote goes to the voting page', async ({ page }) => {
  await page.goto('/dashboard')
  await page
    .locator('.card', { hasText: 'Friday dinner after class' })
    .getByRole('link', { name: 'Open vote' })
    .click()
  await expect(page).toHaveURL('/hangouts/demo/vote')
})

test('Crowds right now counts stations and opens the heat map', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByText(/\d+ busy/)).toBeVisible()
  await page.getByRole('link', { name: 'Open heat map →' }).click()
  await expect(page).toHaveURL('/crowds')
  await expect(page.locator('#crowd-map path.crowd').first()).toBeVisible()
  await expect(page.locator('#crowd-map .midpoint-pin')).toHaveCount(0)
})
