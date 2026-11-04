// Owner: Eashvar (testing; for Hugo's 09 Nearby spots). E2E tests (Week 10c) on the Friday sample
// hangout, with fake Google Places answers (helpers/places.js): spots near the midpoint show,
// Filters narrows them, a spot can be added to the vote and opened. On a phone (helpers/phone.js)
// the spots are a swipeable row, with a menu for Spots, Map and Shortlist.
import { test, expect } from '@playwright/test'
import { setTime, VOTING_OPEN } from './helpers/clock.js'
import { place, stubPlaces } from './helpers/places.js'
import { onPhone } from './helpers/phone.js'

const spots = [
  place('top-cafe', 'Top Rated Cafe', { rating: 4.8 }, 150),
  place('second-cafe', 'Second Cafe', {}, 200),
  place('noodle-house', 'Noodle House', { category: 'food', types: ['restaurant'] }, 250),
  place('town-park', 'Town Park', { category: 'outdoor', types: ['park'] }, 400),
]

async function openExplore(page) {
  await setTime(page, VOTING_OPEN)
  await stubPlaces(page, spots)
  await page.goto('/hangouts/demo/explore')
}

test('spots near the midpoint show', async ({ page }) => {
  await openExplore(page)

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Spots near Bishan')
  await expect(page.getByRole('link', { name: 'Top Rated Cafe', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Noodle House', exact: true })).toBeVisible()
})

test('Filters shows only the chosen kind of spot', async ({ page }) => {
  await openExplore(page)
  const restaurants = page.getByRole('button', { name: 'Restaurants' })
  await expect(restaurants).toBeHidden()

  await page.getByRole('button', { name: 'Filters' }).click()
  await restaurants.click()

  await expect(page.getByRole('link', { name: 'Noodle House', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Top Rated Cafe', exact: true })).toBeHidden()
  await expect(page.getByRole('link', { name: 'Town Park', exact: true })).toBeHidden()
})

test('adding a spot puts it on the Vote Shortlist, and it can be taken off', async ({ page }) => {
  await openExplore(page)
  // the card with this spot's name in it
  const card = page.getByRole('article').filter({ hasText: 'Top Rated Cafe' })
  const remove = page.getByRole('button', { name: 'Remove Top Rated Cafe from shortlist' })

  await card.getByRole('button', { name: 'Add to vote' }).click()
  await expect(card.getByRole('button', { name: 'Added to vote' })).toBeVisible()
  await expect(remove).toBeVisible()

  await remove.click()
  await expect(remove).toBeHidden()
})

test('a spot opens its details page', async ({ page }) => {
  await openExplore(page)

  await page.getByRole('link', { name: 'Noodle House', exact: true }).click()

  await expect(page).toHaveURL('/hangouts/demo/spots/noodle-house')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Noodle House')
})

test('on a phone the menu switches between Spots, Map and Shortlist', async ({ page }) => {
  await onPhone(page)
  await openExplore(page)
  const menu = page.getByRole('button', { name: 'Open explore menu' })
  const next = page.getByRole('button', { name: 'Next spot' })
  const shortlist = page.getByRole('button', { name: /Vote Shortlist/ })
  await expect(next).toBeVisible()
  await expect(shortlist).toBeHidden()

  await menu.click()
  await page.getByRole('button', { name: 'Map', exact: true }).click()
  await expect(page.getByText('Within 1 km of the midpoint')).toBeVisible()
  await expect(next).toBeHidden()

  await menu.click()
  await page.getByRole('button', { name: 'Shortlist', exact: true }).click()
  await expect(shortlist).toBeVisible()

  await menu.click()
  await page.getByRole('button', { name: 'Spots', exact: true }).click()
  await expect(next).toBeVisible()
  await expect(shortlist).toBeHidden()
})

test('on a phone picking a kind of spot goes back to the first card', async ({ page }) => {
  await onPhone(page)
  await openExplore(page)
  const previous = page.getByRole('button', { name: 'Previous spot' })

  await page.getByRole('button', { name: 'Next spot' }).click()
  await expect(previous).toBeVisible()

  await page.getByRole('button', { name: 'Filters' }).click()
  await page.getByRole('button', { name: 'Cafes' }).click()

  await expect(page.getByRole('article')).toHaveCount(2)
  await expect(previous).toBeHidden()
})
