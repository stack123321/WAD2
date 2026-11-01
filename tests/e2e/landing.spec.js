// Owner: Eashvar (testing). 01 Landing, logged out: the hero explains the app and its one button
// starts a hangout, "How it works" and the FAQ are there, a question opens to show its answer,
// and "Log in" in the navbar opens the log in page. Runs without Supabase keys.
import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('the hero button starts a new hangout', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    /^Meet halfway\.\s*Hang out better\.$/,
  )
  await page.getByRole('link', { name: 'Start a hangout' }).first().click()
  await expect(page).toHaveURL('/hangouts/new')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('New hangout')
})

test('explains how it works and answers common questions', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'How it works' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Questions? We’ve got answers.' })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Ready to stop arguing about where to meet?' }),
  ).toBeVisible()
})

test('a question in the FAQ opens to show its answer', async ({ page }) => {
  const question = page.locator('#faq-list .accordion-button').first()
  await expect(question).toHaveAttribute('aria-expanded', 'false')
  await question.click()
  await expect(question).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('#faq-0 .accordion-body')).toBeVisible()
})

test('Log in in the navbar opens the log in page', async ({ page }) => {
  await page.getByRole('link', { name: 'Log in' }).first().click()
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible()
})

test('the hero map fits anyone: you and three friends, no made-up place', async ({ page }) => {
  const map = page.getByRole('img', { name: /you and three friends meeting at a fair midpoint/ })
  await expect(map).toBeVisible()
  await expect(map).toContainText('You')
  await expect(map).not.toContainText('Bishan')
  // the label appears once the animation has played
  await expect(map.getByText('Fair for everyone')).toBeVisible()
  for (const mins of ['18 min', '19 min', '21 min', '22 min']) {
    await expect(map.getByText(mins, { exact: true })).toBeVisible()
  }
})

test('with reduced motion the hero map shows straight away, and phones get the time range', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  const label = page.locator('.midpoint-label')
  await expect(label).toHaveText('Fair for everyone · 18–22 min', { timeout: 500 })
  await expect(label).toHaveCSS('opacity', '1')
  await expect(page.locator('.map__chip').first()).toBeHidden()
})
