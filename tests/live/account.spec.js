// Owner: Eashvar (testing). One real account against the real Supabase project (npm run test:live):
// a wrong password is refused, logging out works, preferences are still there after a reload,
// and a starting point is saved to the database. Uses E2E_EMAIL / E2E_PASSWORD (tests/live/helpers.js).
import { test, expect } from '@playwright/test'
import { createHangout, deleteHangout, host, logIn } from './helpers.js'

test('a wrong password is refused', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(host.email)
  await page.getByLabel('Password', { exact: true }).fill('definitely-not-the-password')

  await page.getByRole('button', { name: 'Log in', exact: true }).last().click()

  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page).toHaveURL(/\/login/)
})

test('logging out goes back to being logged out', async ({ page }) => {
  await logIn(page, host)
  await page.getByRole('button', { name: 'Your profile menu' }).click()
  await page.getByRole('button', { name: 'Log out' }).first().click()
  // then the same button again in the "Log out of Fairpoint?" pop-up
  await page.getByRole('dialog').getByRole('button', { name: 'Log out' }).click()

  await expect(page.getByRole('link', { name: 'Log in' }).first()).toBeVisible()
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login/)
})

test('preferences are still there after a reload', async ({ page }) => {
  await logIn(page, host, '/preferences')
  // Cafes stays picked, so Karaoke is never the only activity (saving with none is refused)
  const cafesOff = page.getByRole('button', { name: /Cafes/, pressed: false }).first()
  if (await cafesOff.isVisible()) await cafesOff.click()
  const karaokeWasOn = await page
    .getByRole('button', { name: /Karaoke/, pressed: true })
    .isVisible()

  await page.getByRole('button', { name: /Karaoke/ }).click()
  await page.getByRole('button', { name: 'Save preferences' }).click()
  await expect(page.getByText('Saved ✓')).toBeVisible()
  await page.reload()

  await expect(page.getByRole('button', { name: /Karaoke/, pressed: !karaokeWasOn })).toBeVisible()

  // put Karaoke back the way it was
  await page.getByRole('button', { name: /Karaoke/ }).click()
  await page.getByRole('button', { name: 'Save preferences' }).click()
  await expect(page.getByText('Saved ✓')).toBeVisible()
})

test('a starting point is saved and still there after a reload', async ({ page }) => {
  await logIn(page, host)
  const { name, id } = await createHangout(page)
  // try/finally: the test hangout is deleted even if a check fails
  try {
    await page.getByRole('combobox').fill('Bishan')
    await page.getByRole('option').first().click()
    await expect(page.getByText('✓ Saved')).toBeVisible()
    await page.reload()

    await expect(page).toHaveURL(`/hangouts/${id}/start`)
    await expect(page.getByText(/Bishan/i).first()).toBeVisible()
  } finally {
    await deleteHangout(page, name)
  }
})
