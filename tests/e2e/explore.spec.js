import { test, expect } from '@playwright/test'
import { setTime, VOTING_OPEN } from './helpers/clock.js'
import { place, stubPlaces } from './helpers/places.js'

const spots = [
  place('top-cafe', 'Top Rated Cafe', { rating: 4.8 }, 150),
  place('second-cafe', 'Second Cafe', {}, 200),
  place('noodle-house', 'Noodle House', { category: 'food', types: ['restaurant'] }, 250),
  place('town-park', 'Town Park', { category: 'outdoor', types: ['park'] }, 400),
]

async function openExplore(page, { mobile = false } = {}) {
  if (mobile) await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/hangouts/demo/explore')
}

async function openMobileMenu(page) {
  await page.getByRole('button', { name: 'Open explore menu' }).click()
  return page.locator('.mobile-toggle-menu')
}

test.beforeEach(async ({ page }) => {
  await setTime(page, VOTING_OPEN)
  await stubPlaces(page, spots)
})

test('loads nearby spots with the default Places preference', async ({ page }) => {
  await openExplore(page)

  await expect(page.getByRole('link', { name: 'Top Rated Cafe', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Noodle House', exact: true })).toBeVisible()
})

test('honors an explicit Google Places opt-out', async ({ page }) => {
  await page.addInitScript(() =>
    window.localStorage.setItem('fairpoint.googlePlacesEnabled', 'false'),
  )
  await openExplore(page)

  await expect(page.getByText('Google Places is off.', { exact: false })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Top Rated Cafe', exact: true })).toHaveCount(0)
})

test('mobile document scrolling is locked only while Explore is active', async ({ page }) => {
  await openExplore(page, { mobile: true })

  const html = page.locator('html')
  const body = page.locator('body')
  await expect(html).toHaveClass(/explore-mobile-scroll-locked/)
  await expect(body).toHaveClass(/explore-mobile-scroll-locked/)
  expect(
    await page.evaluate(() =>
      [document.documentElement, document.body].map(
        (element) => getComputedStyle(element).overflowY,
      ),
    ),
  ).toEqual(['hidden', 'hidden'])

  await page.goto('/')
  await expect(html).not.toHaveClass(/explore-mobile-scroll-locked/)
  await expect(body).not.toHaveClass(/explore-mobile-scroll-locked/)
})

test('desktop filters control the desktop menu and filter the spots', async ({ page }) => {
  await openExplore(page)

  await expect(page.getByRole('heading', { name: 'Vote Shortlist' })).toBeVisible()
  await expect(page.locator('.shortlist-toggle')).toBeHidden()
  await expect(page.locator('#explore-shortlist-content')).toBeVisible()

  const menu = page.locator('#explore-filters')
  const toggle = page.locator('.desktop-filter-toggle')
  await expect(menu).toBeHidden()
  await toggle.click()
  await expect(menu).toBeVisible()
  await expect(menu).toHaveClass(/is-desktop-visible/)
  await expect(menu).not.toHaveClass(/is-mobile-visible/)

  await menu.getByRole('button', { name: 'Restaurants' }).click()
  await expect(page.getByRole('link', { name: 'Noodle House', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Top Rated Cafe', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Town Park', exact: true })).toHaveCount(0)

  await toggle.click()
  await expect(menu).toBeHidden()
})

test('mobile hamburger selects Spots, Map, and Shortlist', async ({ page }) => {
  await openExplore(page, { mobile: true })
  const menu = await openMobileMenu(page)
  const viewButtons = menu.getByRole('button')

  await expect(viewButtons).toHaveCount(3)
  await expect(menu.getByRole('button', { name: 'Spots' })).toBeVisible()
  await expect(menu.getByRole('button', { name: 'Map' })).toBeVisible()
  await expect(menu.getByRole('button', { name: 'Shortlist' })).toBeVisible()
  await expect(menu.getByRole('button', { name: 'Filters' })).toHaveCount(0)
  await expect(menu.getByRole('button', { name: 'Ask' })).toHaveCount(0)

  const row = page.locator('.map-shortlist-row')
  await menu.getByRole('button', { name: 'Map' }).click()
  await expect(row).toHaveClass(/is-mobile-map/)
  await expect(page.locator('.mobile-spots-controls')).toBeHidden()
  await expect(page.locator('.cards-carousel__arrow--next')).toBeHidden()
  await expect(row.locator('.map')).toBeVisible()
  await expect(row.locator('.shortlist-panel')).toBeHidden()

  const slider = row.locator('.radius-slider')
  expect(
    await slider.evaluate((element) => {
      const bounds = element.getBoundingClientRect()
      const mapBounds = element.closest('.map-content').querySelector('.map').getBoundingClientRect()
      return bounds.left >= mapBounds.left &&
        bounds.left - mapBounds.left < mapBounds.width / 2 &&
        mapBounds.bottom - bounds.bottom < 24
    }),
  ).toBe(true)

  const openMenuAgain = await openMobileMenu(page)
  await openMenuAgain.getByRole('button', { name: 'Shortlist' }).click()
  await expect(row).toHaveClass(/is-mobile-shortlist/)
  await expect(row.locator('.map-section')).toBeHidden()
  await expect(row.locator('.shortlist-panel')).toBeVisible()
  await expect(page.locator('.cards-carousel__arrow--next')).toBeHidden()

  const returnMenu = await openMobileMenu(page)
  await returnMenu.getByRole('button', { name: 'Spots' }).click()
  await expect(row).toBeHidden()
  await expect(page.locator('.mobile-spots-controls')).toBeVisible()
  await expect(page.locator('.cards-carousel__arrow--next')).toBeVisible()
})

test('mobile Spots controls open and dismiss Filters and Ask', async ({ page }) => {
  await openExplore(page, { mobile: true })
  const menu = await openMobileMenu(page)
  await menu.getByRole('button', { name: 'Spots' }).click()

  const controls = page.locator('.mobile-spots-controls')
  const filterMenu = page.locator('#explore-filters')
  await controls.getByRole('button', { name: 'Filters' }).click()
  await expect(filterMenu).toBeVisible()
  await expect(filterMenu).toHaveClass(/is-mobile-visible/)
  await expect(filterMenu).not.toHaveClass(/is-desktop-visible/)
  await page.locator('.mobile-filter-barrier').click({ position: { x: 350, y: 50 } })
  await expect(filterMenu).toBeHidden()

  await controls.getByRole('button', { name: 'Ask for something specific' }).click()
  await expect(page.locator('.ask-panel')).toBeVisible()
  await expect(page.locator('.mobile-filter-barrier')).toBeVisible()
  await page.locator('.mobile-filter-barrier').click({ position: { x: 350, y: 50 } })
  await expect(page.locator('.ask-panel')).toBeHidden()
})

test('mobile category filter returns the carousel to its first card', async ({ page }) => {
  await openExplore(page, { mobile: true })
  const previous = page.getByRole('button', { name: 'Previous spot' })
  const next = page.getByRole('button', { name: 'Next spot' })

  await next.click()
  await expect(previous).toBeVisible()

  await page.locator('.mobile-filter-toggle').click()
  await page.locator('#explore-filters').getByRole('button', { name: 'Cafes' }).click()

  await expect(page.locator('.cards article')).toHaveCount(2)
  await expect(previous).toBeHidden()
})

test('adding a spot lists it on Shortlist and lets the user remove it', async ({ page }) => {
  await openExplore(page, { mobile: true })
  const card = page.locator('.cards article').filter({ hasText: 'Top Rated Cafe' })
  await card.getByRole('button', { name: 'Add to vote' }).click()
  await expect(card.getByRole('button', { name: 'Added to vote' })).toBeVisible()

  const menu = await openMobileMenu(page)
  await menu.getByRole('button', { name: 'Shortlist' }).click()
  const shortlist = page.locator('.shortlist-panel')
  await expect(shortlist).toContainText('Top Rated Cafe')
  await shortlist.getByRole('button', { name: 'Remove Top Rated Cafe from shortlist' }).click()
  await expect(shortlist).not.toContainText('Top Rated Cafe')
})

test('a spot opens its details page', async ({ page }) => {
  await openExplore(page)
  await page.getByRole('link', { name: 'Noodle House', exact: true }).click()

  await expect(page).toHaveURL('/hangouts/demo/spots/noodle-house')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Noodle House')
})
