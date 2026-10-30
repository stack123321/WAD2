// Owner: Eashvar (testing). One real account against the real Supabase project (npm run test:live):
// a wrong password is refused, logging out works, preferences are still there after a reload,
// and a starting point is saved to the database. Uses E2E_EMAIL / E2E_PASSWORD (tests/live/helpers.js).
import { test, expect } from '@playwright/test'
import { createHangout, deleteHangout, host, logIn } from './helpers.js'

test('a wrong password is refused', async ({ page }) => {
  await page.goto('/login')
  await page.locator('#auth-email').fill(host.email)
  await page.locator('#auth-password').fill('definitely-not-the-password')
  await page.locator('button[type="submit"]').click()

  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page).toHaveURL(/\/login/)
})

test('logging out goes back to being logged out', async ({ page }) => {
  await logIn(page, host)
  page.once('dialog', (dialog) => dialog.accept()) // "Log out of Fairpoint?"
  await page.getByRole('button', { name: 'Your profile menu' }).click()
  await page.getByRole('button', { name: 'Log out' }).first().click()

  await expect(page.getByRole('link', { name: 'Log in' }).first()).toBeVisible()
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login/)
})

test('preferences are still there after a reload', async ({ page }) => {
  await logIn(page, host, '/preferences')
  const karaoke = page.getByRole('button', { name: /Karaoke/ })
  const was = await karaoke.getAttribute('aria-pressed')
  // Karaoke can't be the only activity, or saving it off would be refused
  const cafes = page.getByRole('button', { name: /Cafes/ }).first()
  if ((await cafes.getAttribute('aria-pressed')) !== 'true') await cafes.click()

  try {
    await karaoke.click()
    await page.getByRole('button', { name: 'Save preferences' }).click()
    await expect(page.getByText('Saved ✓')).toBeVisible()

    await page.reload()
    await expect(page.getByRole('button', { name: /Karaoke/ })).toHaveAttribute(
      'aria-pressed',
      was === 'true' ? 'false' : 'true',
    )
  } finally {
    // put it back the way it was
    const now = page.getByRole('button', { name: /Karaoke/ })
    if ((await now.getAttribute('aria-pressed')) !== was) {
      await now.click()
      await page.getByRole('button', { name: 'Save preferences' }).click()
      await expect(page.getByText('Saved ✓')).toBeVisible()
    }
  }
})

test('a starting point is saved and still there after a reload', async ({ page }) => {
  await logIn(page, host)
  const { name, id } = await createHangout(page)
  try {
    await page.getByRole('combobox').fill('Bishan')
    const first = page.getByRole('option').first()
    const label = (await first.innerText()).split('\n')[0].trim()
    await first.click()
    await expect(page.getByText('✓ Saved')).toBeVisible()

    await page.reload()
    await expect(page).toHaveURL(`/hangouts/${id}/start`)
    await expect(page.getByRole('listitem').filter({ hasText: '(you)' })).toContainText(label)
  } finally {
    await deleteHangout(page, name)
  }
})
