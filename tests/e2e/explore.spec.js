// Owner: Eashvar (testing). 09 Nearby spots on the demo hangout (midpoint Bishan, Fri 16 Oct 7 pm,
// vibe "chill, food"), with fake Google Places answers (helpers/places.js): the category filters,
// "Hide 0% matches", the distance slider, sorting, adding and removing spots on the vote shortlist
// (3 per person), Go Vote!, and on a phone the full-screen cards with a Filters panel.
import { test, expect } from '@playwright/test'
import { place, stubPlaces } from './helpers/places.js'

// Open 6 am to 12 pm every day, so it's closed during the 7 pm hangout: a 0% match
const morningsOnly = {
  periods: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    open: { day, hour: 6, minute: 0 },
    close: { day, hour: 12, minute: 0 },
  })),
}

const SPOTS = [
  place('top-cafe', 'Top Rated Cafe', { rating: 4.8, price_level: 2 }, 150),
  place('cheap-cafe', 'Cheap Cafe', { rating: 3.5, price_level: 1 }, 300),
  place('noodle-house', 'Noodle House', { category: 'food', types: ['restaurant'] }, 250),
  place('town-park', 'Town Park', { category: 'outdoor', types: ['park'] }, 400),
  place('city-museum', 'City Museum', { category: 'activity', types: ['museum'] }, 500),
  place('morning-cafe', 'Morning Cafe', { opening_hours: morningsOnly }, 350),
  place('far-cafe', 'Far Away Cafe', {}, 2500),
]

const card = (page, name) => page.locator('.cards article', { hasText: name })
const cardNames = (page) => page.locator('.cards .spot-card__link')

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-14T22:00:00+08:00'))
  await stubPlaces(page, SPOTS)
})

test.describe('On a laptop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/hangouts/demo/explore')
    await expect(card(page, 'Top Rated Cafe')).toBeVisible()
  })

  test('only spots within 1 km show at first, and the slider widens it', async ({ page }) => {
    await expect(card(page, 'Far Away Cafe')).toHaveCount(0)
    await page.getByLabel(/Within .* km of the midpoint/).fill('3')
    await expect(page.getByText('Within 3 km of the midpoint')).toBeVisible()
    await expect(card(page, 'Far Away Cafe')).toBeVisible()
  })

  test('a category filter shows only that kind of spot', async ({ page }) => {
    await page.getByRole('button', { name: 'Restaurants' }).click()
    await expect(cardNames(page)).toHaveText(['Noodle House'])

    await page.getByRole('button', { name: 'Parks & nature' }).click()
    await expect(cardNames(page)).toHaveText(['Town Park'])

    // Museums & culture goes by Google's place type, not the category
    await page.getByRole('button', { name: 'Museums & culture' }).click()
    await expect(cardNames(page)).toHaveText(['City Museum'])

    await page.getByRole('button', { name: 'All' }).click()
    await expect(cardNames(page)).toHaveCount(6)
  })

  test('"Hide 0% matches" hides a spot closed during the hangout', async ({ page }) => {
    await expect(card(page, 'Morning Cafe')).toContainText('0% match')
    await page.getByLabel('Hide 0% matches').check()
    await expect(card(page, 'Morning Cafe')).toHaveCount(0)
    await expect(card(page, 'Top Rated Cafe')).toBeVisible()
  })

  test('sorting by rating or price changes the order', async ({ page }) => {
    await page.getByRole('button', { name: 'Cafes' }).click()
    await page.getByLabel('Hide 0% matches').check()

    await page.getByLabel('Sort spots').selectOption({ label: 'Ratings' })
    await expect(cardNames(page).first()).toHaveText('Top Rated Cafe')

    await page.getByLabel('Sort spots').selectOption({ label: 'Price level (ascending)' })
    await expect(cardNames(page).first()).toHaveText('Cheap Cafe')
  })

  test('adding a spot puts it on the shortlist, and × takes it off', async ({ page }) => {
    const shortlist = page.locator('.shortlist-list')
    await card(page, 'Top Rated Cafe').getByRole('button', { name: 'Add to vote' }).click()

    await expect(card(page, 'Top Rated Cafe').getByRole('button')).toHaveText('Added to vote')
    await expect(shortlist).toContainText('Top Rated Cafe')

    await page.getByRole('button', { name: 'Remove Top Rated Cafe from shortlist' }).click()
    await expect(shortlist).not.toContainText('Top Rated Cafe')
    await expect(card(page, 'Top Rated Cafe').getByRole('button')).toHaveText('Add to vote')
  })

  test('each person can add at most 3 spots', async ({ page }) => {
    for (const name of ['Top Rated Cafe', 'Cheap Cafe', 'Noodle House']) {
      await card(page, name).getByRole('button', { name: 'Add to vote' }).click()
    }
    await card(page, 'Town Park').getByRole('button', { name: 'Add to vote' }).click()

    await expect(
      page.getByText('You can only add 3 spots to the shortlist. Remove one to add another.'),
    ).toBeVisible()
    await expect(page.locator('.shortlist-list')).not.toContainText('Town Park')
  })

  test('Go Vote! opens 11 once there are 2 or more spots', async ({ page }) => {
    // the sample shortlist already has 3
    await page.locator('.shortlist-panel').getByRole('link', { name: 'Go Vote!' }).click()
    await expect(page).toHaveURL('/hangouts/demo/vote')
  })

  test('a spot card opens its details page', async ({ page }) => {
    await page.getByRole('link', { name: 'Noodle House', exact: true }).click()
    await expect(page).toHaveURL('/hangouts/demo/spots/noodle-house')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Noodle House')
  })
})

test.describe('On a phone', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/hangouts/demo/explore')
    await expect(card(page, 'Top Rated Cafe')).toBeVisible()
  })

  test('each spot fills the screen and the cards swipe sideways', async ({ page }) => {
    const first = await card(page, 'Top Rated Cafe').boundingBox()
    expect(Math.round(first.width)).toBe(375)

    const cards = page.locator('.cards')
    await cards.evaluate((el) => el.scrollTo({ left: el.clientWidth }))
    await expect
      .poll(() => cards.evaluate((el) => Math.round(el.scrollLeft / el.clientWidth)))
      .toBe(1)

    // the map and shortlist are left out on phones; Go Vote! sits at the top instead
    await expect(page.locator('.map-shortlist-row')).toBeHidden()
    await expect(page.locator('.head').getByRole('link', { name: 'Go Vote!' })).toBeVisible()
  })

  test('the Filters button opens and closes the filter panel', async ({ page }) => {
    const filters = page.getByRole('button', { name: 'Filters' })
    await expect(page.getByRole('button', { name: 'Restaurants' })).toBeHidden()

    await filters.click()
    await expect(filters).toHaveAttribute('aria-expanded', 'true')
    await page.getByRole('button', { name: 'Restaurants' }).click()
    await expect(cardNames(page)).toHaveText(['Noodle House'])

    await filters.click()
    await expect(page.getByRole('button', { name: 'Restaurants' })).toBeHidden()
  })

  test('nothing scrolls sideways and the buttons are easy to tap', async ({ page }) => {
    // Known (29 Oct): Go Vote! and Add to vote are 31px tall on phones. Hugo is on 09's phone
    // layout; once they're 44px this test passes, Playwright reports it, and this line goes.
    test.fail(true, 'Go Vote! and Add to vote are 31px tall on phones (Hugo, 09)')
    const layout = await page.evaluate(() => ({
      pageWidth: document.documentElement.scrollWidth,
      tooSmall: [...document.querySelectorAll('.nearby-page button, .nearby-page .btn')]
        .filter((el) => el.offsetParent !== null && el.getBoundingClientRect().width > 0)
        .filter((el) => {
          const r = el.getBoundingClientRect()
          return r.left >= 0 && r.right <= window.innerWidth // the card on screen only
        })
        .map((el) => ({
          control: el.getAttribute('aria-label') || el.textContent.trim(),
          height: Math.round(el.getBoundingClientRect().height),
        }))
        .filter((c) => c.height < 44),
    }))
    expect(layout.pageWidth).toBeLessThanOrEqual(375)
    expect(layout.tooSmall).toEqual([])
  })
})
