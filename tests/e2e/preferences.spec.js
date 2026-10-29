// Owner: Eashvar (testing). 03 Preferences: choices are toggle chips (pressed or not), at least one
// activity is needed before saving, saving says "Saved ✓", and the 4-step setup after sign up
// (?setup=1) goes Get started → Step 1 of 4 … Step 4 of 4 → My hangouts, with Back and "Skip for
// now". Without Supabase keys nothing is stored, so this checks the page's behaviour.
import { test, expect } from '@playwright/test'

// Unpress every activity chip (the first group of chips), so a test starts from "nothing picked"
async function clearActivities(page) {
  const chips = page.locator('.chips').first()
  for (const chip of await chips.locator('[aria-pressed="true"]').all()) await chip.click()
  await expect(chips.locator('[aria-pressed="true"]')).toHaveCount(0)
}

test.describe('Editing my preferences', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/preferences')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tell us what you like')
  })

  test('a chip shows whether it is picked', async ({ page }) => {
    const cafes = page.getByRole('button', { name: /Cafes/ }).first()
    const before = await cafes.getAttribute('aria-pressed')
    await cafes.click()
    await expect(cafes).toHaveAttribute('aria-pressed', before === 'true' ? 'false' : 'true')
  })

  test('saving needs at least one activity', async ({ page }) => {
    await clearActivities(page)
    await page.getByRole('button', { name: 'Save preferences' }).click()
    await expect(
      page.getByText('Pick at least one so we can suggest spots you’ll enjoy.'),
    ).toBeVisible()
    await expect(page.getByText('Saved ✓')).toHaveCount(0)
  })

  test('saving says so, and changing something again clears it', async ({ page }) => {
    await clearActivities(page)
    await page.getByRole('button', { name: /Board games/ }).click()
    await page.getByRole('button', { name: 'Save preferences' }).click()
    await expect(page.getByText('Saved ✓')).toBeVisible()

    await page.getByRole('button', { name: /Karaoke/ }).click()
    await expect(page.getByText('Saved ✓')).toHaveCount(0)
  })

  test('"No restrictions" clears the dietary needs', async ({ page }) => {
    const halal = page.getByRole('button', { name: /Halal/ })
    const none = page.getByRole('button', { name: /No restrictions/ })
    await halal.click()
    await expect(halal).toHaveAttribute('aria-pressed', 'true')
    await expect(none).toHaveAttribute('aria-pressed', 'false')

    await none.click()
    await expect(halal).toHaveAttribute('aria-pressed', 'false')
    await expect(none).toHaveAttribute('aria-pressed', 'true')
  })
})

test.describe('Setting up after sign up', () => {
  test('goes through the 4 steps and ends on My hangouts', async ({ page }) => {
    await page.goto('/preferences?setup=1')
    await page.getByRole('button', { name: 'Get started' }).click()
    await expect(page.getByText('Step 1 of 4')).toBeVisible()

    // Step 1 needs an activity before Next works
    await clearActivities(page)
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText('Step 1 of 4')).toBeVisible()
    await expect(
      page.getByText('Pick at least one so we can suggest spots you’ll enjoy.'),
    ).toBeVisible()

    await page.getByRole('button', { name: /Cafes/ }).first().click()
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText('Step 2 of 4')).toBeVisible()

    // Back returns to the step before
    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page.getByText('Step 1 of 4')).toBeVisible()
    await page.getByRole('button', { name: 'Next' }).click()

    await page.getByRole('button', { name: 'Skip for now' }).click()
    await expect(page.getByText('Step 3 of 4')).toBeVisible()
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText('Step 4 of 4')).toBeVisible()

    await page.getByRole('button', { name: 'Save preferences' }).click()
    await expect(page).toHaveURL('/dashboard')
  })
})
