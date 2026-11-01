// Owner: Eashvar (testing). E2E tests (Week 10c) for 09 Nearby spots on the Friday sample hangout
// (midpoint Bishan), with fake Google Places answers (helpers/places.js): Google Places is enabled
// by default, a category filter shows only that kind of spot, and a spot opens its details page.
import { test, expect } from '@playwright/test'
import { setTime, VOTING_OPEN } from './helpers/clock.js'
import { place, stubPlaces } from './helpers/places.js'

const SPOTS = [
  place(
    'top-cafe',
    'Top Rated Cafe',
    {
      rating: 4.8,
      tags: Array.from({ length: 48 }, (_, index) => `Test tag ${index + 1}`),
    },
    150,
  ),
  place('noodle-house', 'Noodle House', { category: 'food', types: ['restaurant'] }, 250),
  place('town-park', 'Town Park', { category: 'outdoor', types: ['park'] }, 400),
]

test.beforeEach(async ({ page }) => {
  await setTime(page, VOTING_OPEN)
  await stubPlaces(page, SPOTS)
})

test('nearby spots show places from Google Places', async ({ page }) => {
  await page.goto('/hangouts/demo/explore')

  await expect(page.getByRole('link', { name: 'Top Rated Cafe', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Noodle House', exact: true })).toBeVisible()
})

test('mobile Explore locks document scrolling and releases the lock on exit', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/hangouts/demo/explore')

  const html = page.locator('html')
  const body = page.locator('body')
  await expect(html).toHaveClass(/explore-mobile-scroll-locked/)
  await expect(body).toHaveClass(/explore-mobile-scroll-locked/)
  expect(
    await page.evaluate(
      () =>
        [document.documentElement, document.body].map(
          (element) => getComputedStyle(element).overflowY,
        ),
    ),
  ).toEqual(['hidden', 'hidden'])

  await page.setViewportSize({ width: 1024, height: 812 })
  await expect(html).not.toHaveClass(/explore-mobile-scroll-locked/)
  await expect(body).not.toHaveClass(/explore-mobile-scroll-locked/)

  await page.setViewportSize({ width: 375, height: 812 })
  await expect(html).toHaveClass(/explore-mobile-scroll-locked/)
  await page.goto('/')
  await expect(html).not.toHaveClass(/explore-mobile-scroll-locked/)
  await expect(body).not.toHaveClass(/explore-mobile-scroll-locked/)
})

test('a category filter shows only that kind of spot', async ({ page }) => {
  await page.goto('/hangouts/demo/explore')

  const filtersToggle = page.getByRole('button', { name: 'Filters', exact: true })
  const filterMenu = page.locator('#explore-filters')
  await expect(filterMenu).toBeHidden()
  await filtersToggle.click()
  await expect(filterMenu).toBeVisible()
  await expect(filterMenu).toHaveClass(/is-desktop-visible/)
  await expect(filterMenu).not.toHaveClass(/is-mobile-visible/)

  const matchFilter = page.getByRole('checkbox', { name: 'Hide 0% matches' })
  const sortSelect = page.getByRole('combobox', { name: 'Sort spots' })
  const controlRows = await Promise.all([
    matchFilter.boundingBox(),
    sortSelect.boundingBox(),
  ])
  const controlCenters = controlRows.map((box) => box.y + box.height / 2)
  expect(Math.abs(controlCenters[0] - controlCenters[1])).toBeLessThan(2)

  await page.getByRole('button', { name: 'Restaurants' }).click()

  await expect(page.getByRole('link', { name: 'Noodle House', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Top Rated Cafe', exact: true })).toBeHidden()
  await expect(page.getByRole('link', { name: 'Town Park', exact: true })).toBeHidden()
  await filtersToggle.click()
  await expect(filterMenu).toBeHidden()
})

test('mobile menu selects views and Spots exposes its own Filters and Ask controls', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/hangouts/demo/explore')

  const filterMenu = page.locator('#explore-filters')
  const desktopToggle = page.locator('.desktop-filter-toggle')
  await page.getByRole('button', { name: 'Open explore menu' }).click()
  const mobileMenu = page.locator('.mobile-toggle-menu')
  await expect(mobileMenu.getByRole('button', { name: 'Spots' })).toBeVisible()
  await expect(mobileMenu.getByRole('button', { name: 'Map' })).toBeVisible()
  await expect(mobileMenu.getByRole('button', { name: 'Shortlist' })).toBeVisible()
  await expect(mobileMenu.getByRole('button', { name: 'Filters' })).toHaveCount(0)
  await expect(mobileMenu.getByRole('button', { name: 'Ask' })).toHaveCount(0)
  await mobileMenu.getByRole('button', { name: 'Spots' }).click()

  await expect(desktopToggle).toBeHidden()
  await expect(mobileMenu).toBeHidden()
  const spotsControls = page.locator('.mobile-spots-controls')
  const askButton = spotsControls.getByRole('button', { name: 'Ask for something specific' })
  const voteButton = spotsControls.locator('.mobile-vote-action')
  await expect(askButton).toBeVisible()
  await expect(voteButton).toBeVisible()
  const [askBox, voteBox] = await Promise.all([askButton.boundingBox(), voteButton.boundingBox()])
  expect(voteBox.x).toBeGreaterThanOrEqual(askBox.x + askBox.width)

  const mobileToggle = spotsControls.getByRole('button', { name: 'Filters' })
  await expect(mobileToggle).toBeVisible()
  await mobileToggle.click()
  await expect(filterMenu).toHaveClass(/is-mobile-visible/)
  await expect(filterMenu).not.toHaveClass(/is-desktop-visible/)
  await expect(page.locator('.mobile-filter-barrier')).toBeVisible()

  await page.locator('.mobile-filter-barrier').click({ position: { x: 350, y: 50 } })
  await expect(filterMenu).toBeHidden()

  const mapShortlist = page.locator('.map-shortlist-row')
  await page.getByRole('button', { name: 'Open explore menu' }).click()
  await mobileMenu.getByRole('button', { name: 'Map' }).click()
  await expect(mapShortlist).toHaveClass(/is-mobile-map/)
  await expect(page.locator('.mobile-spots-controls')).toBeHidden()
  const slider = mapShortlist.locator('.radius-slider')
  expect(
    await slider.evaluate((element) => {
      const sliderRect = element.getBoundingClientRect()
      const mapRect = element.closest('.map-content').querySelector('.map').getBoundingClientRect()
      return (
        sliderRect.left >= mapRect.left &&
        sliderRect.left - mapRect.left < mapRect.width / 2 &&
        mapRect.bottom - sliderRect.bottom < 24
      )
    }),
  ).toBe(true)

  await page.getByRole('button', { name: 'Open explore menu' }).click()
  await mobileMenu.getByRole('button', { name: 'Shortlist' }).click()
  await expect(mapShortlist).toHaveClass(/is-mobile-shortlist/)
  await expect(mapShortlist.locator('.shortlist-panel')).toBeVisible()

  await page.getByRole('button', { name: 'Open explore menu' }).click()
  await mobileMenu.getByRole('button', { name: 'Spots' }).click()
  await expect(mapShortlist).toBeHidden()
  await expect(page.locator('.mobile-spots-controls')).toBeVisible()
})

test('mobile Ask menu blocks the rest of the page until dismissed', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/hangouts/demo/explore')

  await page.getByRole('button', { name: 'Open explore menu' }).click()
  await page.locator('.mobile-spots-controls').getByRole('button', { name: 'Ask for something specific' }).click()

  const askPanel = page.locator('.ask-panel')
  const barrier = page.locator('.mobile-filter-barrier')
  await expect(page.getByRole('button', { name: 'Open explore menu' })).toBeVisible()
  await expect(askPanel).toBeVisible()
  await expect(barrier).toBeVisible()
  await expect
    .poll(() =>
      askPanel.evaluate((panel) => Number(getComputedStyle(panel).zIndex)),
    )
    .toBeGreaterThan(
      await page.locator('.mobile-toggles').evaluate((toggles) =>
        Number(getComputedStyle(toggles).zIndex),
      ),
    )

  await barrier.click({ position: { x: 350, y: 50 } })
  await expect(askPanel).toBeHidden()
  await expect(barrier).toBeHidden()
})

test('mobile Spots, Map, and Shortlist views switch through the hamburger menu', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/hangouts/demo/explore')
  await expect(page.getByRole('link', { name: 'Top Rated Cafe', exact: true })).toBeVisible()
  await page.locator('.nearby-page').evaluate((element) =>
    element.classList.add('has-mobile-tabbar'),
  )

  const firstCard = page.locator('.cards article').first()
  const addButton = firstCard.getByRole('button', { name: 'Add to vote' })
  await expect(addButton).toBeVisible()
  const buttonBox = await addButton.boundingBox()
  expect(buttonBox.y + buttonBox.height).toBeLessThanOrEqual(812 - 76)
  const [pageBox, panelBox] = await Promise.all([
    page.locator('.nearby-page').boundingBox(),
    firstCard.locator('.spot-card__body').boundingBox(),
  ])
  expect(Math.abs(panelBox.y + panelBox.height - (pageBox.y + pageBox.height))).toBeLessThan(1)
  expect(pageBox.y + pageBox.height).toBeLessThanOrEqual(812 - 76)

  const details = firstCard.locator('.spot-card__details')
  expect(
    await details.evaluate((element) => element.scrollHeight > element.clientHeight),
  ).toBe(true)
  await details.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await expect(firstCard.getByText('Test tag 48', { exact: true })).toBeInViewport()

  const menuToggle = page.getByRole('button', { name: 'Open explore menu' })
  await menuToggle.click()
  const mapToggle = page.getByRole('button', { name: 'Map', exact: true })
  const mapShortlist = page.locator('.map-shortlist-row')
  await expect(mapShortlist).toBeHidden()

  await mapToggle.click()
  await expect(page.getByRole('button', { name: 'Open explore menu' })).toBeVisible()
  await expect(page.locator('#explore-mobile-actions')).toBeHidden()
  await expect(mapShortlist).toHaveClass(/is-mobile-map/)
  await expect(mapShortlist).toBeVisible()
  await expect(page.locator('.cards-carousel__arrow--previous')).toBeHidden()
  await expect(page.locator('.cards-carousel__arrow--next')).toBeHidden()
  const map = page.locator('.map-shortlist-row.is-mobile-map .map')
  const slider = page.locator('.map-shortlist-row.is-mobile-map .radius-slider')
  await expect(page.locator('.leaflet-overlay-pane path.leaflet-interactive').first()).toBeVisible()
  await expect(mapShortlist.locator('.shortlist-panel')).toBeHidden()
  await expect(map.locator('.leaflet-control-zoom')).toBeHidden()
  expect(
    await slider.evaluate((element) => {
      const sliderRect = element.getBoundingClientRect()
      const mapRect = element.closest('.map-content').querySelector('.map').getBoundingClientRect()
      return (
        sliderRect.left >= mapRect.left &&
        sliderRect.left - mapRect.left < mapRect.width / 2 &&
        mapRect.bottom - sliderRect.bottom < 24
      )
    }),
  ).toBe(true)
  await expect(map).toBeVisible()

  await page.locator('.leaflet-overlay-pane path.leaflet-interactive').first().click()
  await expect(mapShortlist).toBeHidden()
  await expect(page.getByRole('link', { name: 'Top Rated Cafe', exact: true })).toBeVisible()

  await page.locator('.cards article').first().getByRole('button', { name: 'Add to vote' }).click()
  await page.getByRole('button', { name: 'Open explore menu' }).click()
  const shortlistToggle = page.getByRole('button', { name: 'Shortlist', exact: true })
  await shortlistToggle.click()
  await expect(page.locator('#explore-mobile-actions')).toBeHidden()
  await expect(mapShortlist).toHaveClass(/is-mobile-shortlist/)
  await expect(mapShortlist).toContainText('Top Rated Cafe')
  await expect(page.locator('.cards-carousel__arrow--previous')).toBeHidden()
  await expect(page.locator('.cards-carousel__arrow--next')).toBeHidden()
  await expect(mapShortlist.locator('.map-section')).toBeHidden()
  await expect(mapShortlist.locator('.shortlist-panel')).toBeVisible()

  await page.getByRole('button', { name: 'Open explore menu' }).click()
  await page.getByRole('button', { name: 'Spots', exact: true }).click()
  await expect(page.locator('#explore-mobile-actions')).toBeHidden()
  await expect(mapShortlist).toBeHidden()
  await expect(page.getByRole('link', { name: 'Top Rated Cafe', exact: true })).toBeVisible()
  await expect(page.locator('.mobile-spots-controls')).toBeVisible()
  await expect(page.locator('.cards-carousel__arrow--next')).toBeVisible()

  const addedButton = page.locator('.cards article').first().getByRole('button', { name: 'Added to vote' })
  await addedButton.click()
  await expect(page.locator('.cards article').first().getByRole('button', { name: 'Add to vote' })).toBeVisible()
  await page.getByRole('button', { name: 'Open explore menu' }).click()
  await page.getByRole('button', { name: 'Shortlist', exact: true }).click()
  await expect(mapShortlist).not.toContainText('Top Rated Cafe')
})

test('a spot opens its details page', async ({ page }) => {
  await page.goto('/hangouts/demo/explore')

  await page.getByRole('link', { name: 'Noodle House', exact: true }).click()

  await expect(page).toHaveURL('/hangouts/demo/spots/noodle-house')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Noodle House')
})
