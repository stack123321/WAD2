// Owner: Eashvar (testing). E2E tests (Week 10c) for the Ask box on 09 Nearby spots ("prata for
// dinner, one of us is halal"): asking shows a reply for the request, and "Show all spots" goes
// back to the usual list. The tests run without Gemini or Google keys, so /api/assistant answers
// with its sample reply. The usual list comes from the fake Google Places answers
// (helpers/places.js). How the group's needs are worked out has unit tests in
// src/components/assistant/__tests__.
import { test, expect } from '@playwright/test'
import { setTime, VOTING_OPEN } from './helpers/clock.js'
import { place, stubPlaces, turnOnGooglePlaces } from './helpers/places.js'

const askBox = (page) => page.getByRole('textbox', { name: 'Ask for something specific' })
const reply = 'Sample results for "prata for dinner" near Bishan'

test.beforeEach(async ({ page }, testInfo) => {
  const isPhoneTest = testInfo.title.startsWith('on a phone')
  if (isPhoneTest) {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.addInitScript(() =>
      window.localStorage.setItem('fairpoint.googlePlacesEnabled', 'true'),
    )
  }
  await setTime(page, VOTING_OPEN)
  await stubPlaces(page, [place('test-cafe', 'Test Cafe')])
  await page.goto('/hangouts/demo/explore')
  if (!isPhoneTest) await turnOnGooglePlaces(page)
})

test('asking shows a reply for the request', async ({ page }) => {
  await askBox(page).fill('prata for dinner')

  await page.getByRole('button', { name: 'Ask', exact: true }).click()

  await expect(page.getByText(reply)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Show all spots' })).toBeVisible()
})

test('"Show all spots" goes back to the usual list', async ({ page }) => {
  await askBox(page).fill('prata for dinner')
  await page.getByRole('button', { name: 'Ask', exact: true }).click()
  await expect(page.getByText(reply)).toBeVisible()

  await page.getByRole('button', { name: 'Show all spots' }).click()

  await expect(page.getByText(reply)).toBeHidden()
  await expect(page.getByRole('link', { name: 'Test Cafe', exact: true })).toBeVisible()
})

test('on a phone the Ask toggle opens over the cards and closes after a search', async ({
  page,
}) => {
  const toggle = page.getByRole('button', { name: 'Ask for something specific' })

  await expect(askBox(page)).toBeHidden()
  await toggle.click()
  await expect(askBox(page)).toBeVisible()
  await askBox(page).fill('prata for dinner')
  await page.getByRole('button', { name: 'Ask', exact: true }).click()

  await expect(askBox(page)).toBeHidden()
  await expect(toggle).toContainText('Ask ·')
  await toggle.click()
  await expect(page.getByText(reply)).toBeVisible()

  expect(
    Math.round(
      await page.getByRole('button', { name: 'Show all spots' }).evaluate((el) =>
        el.getBoundingClientRect().height,
      ),
    ),
  ).toBeGreaterThanOrEqual(44)

  await page.getByRole('button', { name: 'Show all spots' }).click()
  await expect(page.getByRole('link', { name: 'Test Cafe', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Filters' })).toBeVisible()
})
