// Owner: Eashvar (testing). E2E tests (Week 10c) for the Ask box on 09 Nearby spots ("prata for
// dinner, one of us is halal"): asking shows a reply for the request, and "Reset" goes back to the
// usual list. On a phone (helpers/phone.js) Ask is a button that opens the box over the cards.
// The tests run without Gemini or Google keys, so /api/assistant answers with its sample reply
// (3 sample spots). The usual list comes from the fake Google Places answers (helpers/places.js).
// How the group's needs are worked out has unit tests in src/components/assistant/__tests__.
import { test, expect } from '@playwright/test'
import { setTime, VOTING_OPEN } from './helpers/clock.js'
import { place, stubPlaces } from './helpers/places.js'
import { onPhone } from './helpers/phone.js'

const askBox = (page) => page.getByRole('textbox', { name: 'Ask for something specific' })
// (Surya) on a laptop the Ask box is a pop-up: the Ask Fairpoint button opens it
const askButton = (page) => page.getByRole('button', { name: 'Ask Fairpoint' })
const reply = 'Sample results for "prata for dinner" near Bishan'

// Two usual spots, so the phone carousel has a "Next spot" button. They're set before 09 opens,
// because 09 keeps the spots it loads (sessionStorage) and wouldn't ask again.
async function openExplore(page) {
  await setTime(page, VOTING_OPEN)
  await stubPlaces(page, [
    place('test-cafe', 'Test Cafe'),
    place('second-cafe', 'Second Cafe', {}, 250),
  ])
  await page.goto('/hangouts/demo/explore')
}

async function ask(page, text) {
  await askBox(page).fill(text)
  await page.getByRole('button', { name: 'Ask', exact: true }).click()
}

test('asking shows a reply for the request', async ({ page }) => {
  await openExplore(page)
  await askButton(page).click()

  await ask(page, 'prata for dinner')

  // the pop-up closes so the cards show the results, and the button counts them
  await expect(askButton(page)).toContainText('Ask Fairpoint ·')
  await expect(page.getByRole('button', { name: 'Reset', exact: true })).toBeVisible()
  await askButton(page).click()
  await expect(page.getByText(reply)).toBeVisible()
})

test('"Reset" goes back to the usual list', async ({ page }) => {
  await openExplore(page)
  await askButton(page).click()
  await ask(page, 'prata for dinner')
  await expect(askButton(page)).toContainText('Ask Fairpoint ·')

  await page.getByRole('button', { name: 'Reset', exact: true }).click()

  await expect(page.getByText(reply)).toBeHidden()
  await expect(page.getByRole('link', { name: 'Test Cafe', exact: true })).toBeVisible()
})

test('on a phone Ask opens the box, and it closes after a search', async ({ page }) => {
  await onPhone(page)
  await openExplore(page)
  const toggle = page.getByRole('button', { name: 'Ask for something specific' })
  await expect(askBox(page)).toBeHidden()

  await toggle.click()
  await expect(askBox(page)).toBeVisible()
  await ask(page, 'prata for dinner')

  await expect(askBox(page)).toBeHidden()
  await expect(toggle).toContainText('Need an idea? · 3')
})

test('on a phone Reset goes back to the usual spots', async ({ page }) => {
  await onPhone(page)
  await openExplore(page)
  await page.getByRole('button', { name: 'Ask for something specific' }).click()
  await ask(page, 'prata for dinner')

  await page.getByRole('button', { name: 'Reset Ask results' }).click()

  await expect(page.getByRole('link', { name: 'Test Cafe', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Filters' })).toBeVisible()
})

test('on a phone an Ask result starts again from the first card', async ({ page }) => {
  await onPhone(page)
  await openExplore(page)
  const previous = page.getByRole('button', { name: 'Previous spot' })
  await page.getByRole('button', { name: 'Next spot' }).click()
  await expect(previous).toBeVisible()

  await page.getByRole('button', { name: 'Ask for something specific' }).click()
  await ask(page, 'prata for dinner')

  await expect(page.getByRole('article')).toHaveCount(3)
  await expect(previous).toBeHidden()
})
