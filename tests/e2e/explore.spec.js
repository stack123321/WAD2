// Owner: Eashvar (testing). E2E tests (Week 10c) for 09 Nearby spots on the Friday sample hangout
// (midpoint Bishan), with fake Google Places answers (helpers/places.js): nothing is fetched until
// the user turns Google Places on, a category filter shows only that kind of spot, and a spot
// opens its details page.
import { test, expect } from '@playwright/test'
import { setTime, VOTING_OPEN } from './helpers/clock.js'
import { place, stubPlaces, turnOnGooglePlaces } from './helpers/places.js'

const SPOTS = [
  place('top-cafe', 'Top Rated Cafe', { rating: 4.8 }, 150),
  place('noodle-house', 'Noodle House', { category: 'food', types: ['restaurant'] }, 250),
  place('town-park', 'Town Park', { category: 'outdoor', types: ['park'] }, 400),
]

test.beforeEach(async ({ page }) => {
  await setTime(page, VOTING_OPEN)
  await stubPlaces(page, SPOTS)
})

test('nearby spots show once Google Places is turned on', async ({ page }) => {
  await page.goto('/hangouts/demo/explore')
  await expect(
    page.getByText('Google Places is off. Turn it on to find nearby spots.'),
  ).toBeVisible()

  await turnOnGooglePlaces(page)

  await expect(page.getByRole('link', { name: 'Top Rated Cafe', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Noodle House', exact: true })).toBeVisible()
})

test('a category filter shows only that kind of spot', async ({ page }) => {
  await page.goto('/hangouts/demo/explore')
  await turnOnGooglePlaces(page)

  await page.getByRole('button', { name: 'Restaurants' }).click()

  await expect(page.getByRole('link', { name: 'Noodle House', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Top Rated Cafe', exact: true })).toBeHidden()
  await expect(page.getByRole('link', { name: 'Town Park', exact: true })).toBeHidden()
})

test('a spot opens its details page', async ({ page }) => {
  await page.goto('/hangouts/demo/explore')
  await turnOnGooglePlaces(page)

  await page.getByRole('link', { name: 'Noodle House', exact: true }).click()

  await expect(page).toHaveURL('/hangouts/demo/spots/noodle-house')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Noodle House')
})
