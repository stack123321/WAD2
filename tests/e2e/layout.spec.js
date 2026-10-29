// Owner: Eashvar (testing). The team's layout rule on every page, at phone, tablet and laptop
// width (375, 768 and 1366px): nothing scrolls sideways. Buttons under 44px tall are listed on
// each test in the HTML report ("small buttons") for the page's owner, without failing the test;
// pages with their own layout tests (11, 12, debrief, 09 on phones) fail on those too.
import { test, expect } from '@playwright/test'
import { place, stubPlaces } from './helpers/places.js'

const PAGES = [
  ['01 Landing', '/'],
  ['02 Log in', '/login'],
  ['02 Sign up', '/login?mode=signup'],
  ['03 Preferences', '/preferences'],
  ['04 My hangouts', '/dashboard'],
  ['Crowds', '/crowds'],
  ['Friends', '/friends'],
  ['My Chats', '/chats'],
  ['05 New hangout', '/hangouts/new'],
  ['06 Starting points', '/hangouts/demo/start'],
  ['07 Transport', '/hangouts/demo/transport'],
  ['08 Midpoint', '/hangouts/demo/midpoint'],
  ['09 Nearby spots', '/hangouts/demo/explore'],
  ['10 Spot details', '/hangouts/demo/spots/layout-cafe'],
  ['11 Vote', '/hangouts/demo/vote'],
  ['12 Final plan', '/hangouts/demo/plan'],
]

for (const [device, width, height] of [
  ['a phone', 375, 812],
  ['a tablet', 768, 1024],
  ['a laptop', 1366, 768],
]) {
  test.describe(`On ${device} (${width}px)`, () => {
    for (const [name, path] of PAGES) {
      test(`${name} doesn’t scroll sideways`, async ({ page }, testInfo) => {
        await page.clock.setFixedTime(new Date('2026-10-14T22:00:00+08:00'))
        await stubPlaces(page, [place('layout-cafe', 'Layout Test Cafe')])
        await page.setViewportSize({ width, height })
        await page.goto(path)
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
        await page.evaluate(() => document.fonts.ready) // widths settle once fonts load

        const layout = await page.evaluate(() => ({
          pageWidth: document.documentElement.scrollWidth,
          smallButtons: [...document.querySelectorAll('main button, main .btn, main select')]
            .filter((el) => el.offsetParent !== null && !el.closest('.leaflet-container'))
            .map((el) => ({
              text: (el.getAttribute('aria-label') || el.textContent).trim().slice(0, 40),
              height: Math.round(el.getBoundingClientRect().height),
            }))
            .filter((b) => b.height > 0 && b.height < 44),
        }))
        for (const b of layout.smallButtons) {
          testInfo.annotations.push({
            type: 'small button',
            description: `${b.text} (${b.height}px)`,
          })
        }

        expect(layout.pageWidth, `${name} is wider than the screen`).toBeLessThanOrEqual(width)
      })
    }
  })
}
