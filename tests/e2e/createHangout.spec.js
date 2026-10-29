// Owner: Eashvar (testing). 05 New hangout: Create stays greyed out and says what's missing until
// there's a date and a time, the quick day buttons fill the date, a time in the past is refused,
// a name is suggested when you leave it empty, and creating opens 06 Starting points. Without
// Supabase keys nothing is saved, so this checks the form's behaviour.
import { test, expect } from '@playwright/test'

const createButton = (page) => page.getByRole('button', { name: /Create & add starting points/ })

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-14T10:00:00+08:00'))
  await page.goto('/hangouts/new')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('New hangout')
})

test('Create says what’s missing until there’s a date and a time', async ({ page }) => {
  // the time starts at 7 pm, so only the date is missing
  await expect(page.getByLabel('Time')).toHaveValue('19:00')
  await expect(createButton(page)).toBeDisabled()
  await expect(page.getByText('Add a date to continue.')).toBeVisible()

  await page.getByLabel('Time').fill('')
  await expect(page.getByText('Add a date and a time to continue.')).toBeVisible()

  await page.getByLabel('Date').fill('2026-10-20')
  await expect(page.getByText('Add a time to continue.')).toBeVisible()

  await page.getByLabel('Time').fill('19:00')
  await expect(createButton(page)).toBeEnabled()
  await expect(page.locator('#create-hint')).toHaveCount(0)
})

test('the quick day buttons fill in the date', async ({ page }) => {
  const tomorrow = page.getByRole('group', { name: 'Pick a day' }).getByRole('button', {
    name: 'Tomorrow',
  })
  await tomorrow.click()
  await expect(tomorrow).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('Date')).toHaveValue('2026-10-15')
})

test('a time that has already passed is refused', async ({ page }) => {
  await page.getByLabel('Date').fill('2026-10-14')
  await page.getByLabel('Time').fill('08:00')
  await createButton(page).click()

  await expect(page.getByRole('alert')).toHaveText('Pick a date and time in the future.')
  await expect(page).toHaveURL('/hangouts/new')
})

test('leaving the name empty suggests one', async ({ page }) => {
  await expect(page.getByLabel('Hangout name')).toHaveAttribute('placeholder', /\S+/)
})

test('creating it opens 06 Starting points', async ({ page }) => {
  await page.getByLabel('Hangout name').fill('Test dinner')
  await page.getByLabel('Date').fill('2026-10-20')
  await page.getByLabel('Time').fill('19:00')
  await createButton(page).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Where is everyone coming from?')
})

test('Cancel goes back to My hangouts', async ({ page }) => {
  await page.getByRole('link', { name: 'Cancel' }).click()
  await expect(page).toHaveURL('/dashboard')
})
