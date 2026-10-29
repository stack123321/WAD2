// Owner: Ryan
// page 04 my hangouts with the demo hangout (sample data, no supabase keys needed)
import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  // the sample hangouts are on 16 and 24 Oct, so fix the date before both
  await page.clock.setFixedTime(new Date('2026-10-14T22:00:00+08:00'))

  // fake weather: thundery showers at Friday 7 pm, clear at Saturday 2 pm, and unhealthy haze
  await page.route('https://api.open-meteo.com/**', (route) =>
    route.fulfill({
      json: {
        hourly: {
          time: ['2026-10-16T19:00', '2026-10-24T14:00'],
          temperature_2m: [30, 33],
          precipitation_probability: [70, 5],
          relative_humidity_2m: [85, 60],
          uv_index: [0, 8],
          weather_code: [95, 0],
          is_day: [0, 1],
        },
      },
    }),
  )
  // fake crowd: Bishan is busy
  await page.route('**/api/crowd**', (route) =>
    route.fulfill({
      json: [
        { station: 'Bishan', lat: 1.3508, lng: 103.8481, level: 'h' },
        { station: 'Toa Payoh', lat: 1.3326, lng: 103.8475, level: 'l' },
      ],
    }),
  )
  await page.route('https://api-open.data.gov.sg/**', (route) =>
    route.fulfill({
      json: {
        code: 0,
        data: { items: [{ readings: { psi_twenty_four_hourly: { north: 140, south: 120 } } }] },
      },
    }),
  )
})

test('shows the demo hangout with its voting status', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: 'Friday dinner after class' })).toBeVisible()
  await expect(page.getByText('7:00 pm · Midpoint: Bishan')).toBeVisible()
  await expect(page.getByText('Waiting on Surya')).toBeVisible()
})

test('Past shows an empty message, Upcoming brings the card back', async ({ page }) => {
  await page.goto('/dashboard')
  await page.getByRole('button', { name: 'Past' }).click()
  await expect(page.getByText('No past hangouts yet.')).toBeVisible()
  await page.getByRole('button', { name: 'Upcoming' }).click()
  await expect(page.getByRole('heading', { name: 'Friday dinner after class' })).toBeVisible()
})

test('clicking a card opens its next step, and so does its button', async ({ page }) => {
  await page.goto('/dashboard')
  const card = page.locator('.card', { hasText: 'Friday dinner after class' })
  // the title is a stretched link, so a click anywhere on the card goes to the vote
  await card.getByRole('link', { name: 'Friday dinner after class' }).click()
  await expect(page).toHaveURL('/hangouts/demo/vote')
  await page.goBack()
  await card.getByRole('link', { name: 'View', exact: true }).click()
  await expect(page).toHaveURL('/hangouts/demo/vote')
})

test('My Friends in the navbar opens the friends page', async ({ page }) => {
  await page.goto('/login?redirect=/dashboard')
  await page.getByLabel('Email').fill('ryan@example.com')
  await page.getByLabel('Password', { exact: true }).fill('password123')
  await page.getByRole('button', { name: 'Log in', exact: true }).last().click()
  await page.getByRole('navigation').getByRole('link', { name: /^Friends/ }).click()
  await expect(page).toHaveURL('/friends')
})

// the ⋯ menu holds Pin, Copy invite link and Leave or Delete
async function openMenu(page, hangoutName) {
  await page.getByRole('button', { name: `More options for ${hangoutName}` }).click()
}

test('pinning a hangout from its menu moves it to a PINNED section', async ({ page }) => {
  await page.goto('/dashboard')
  await openMenu(page, 'Saturday study session')
  await page.getByRole('button', { name: 'Pin to top' }).click()
  await expect(page.getByRole('heading', { name: /PINNED 1\/3/ })).toBeVisible()
  const pinned = page.locator('section', { hasText: 'PINNED' })
  await expect(pinned).toContainText('Saturday study session')
  // pinned rows carry their date, because no day heading sits above them
  await expect(pinned).toContainText('Sat 24 Oct · 2:00 pm')
  // and it has left COMING UP
  await expect(page.getByRole('heading', { name: 'COMING UP' })).toHaveCount(0)
})

test('unpinning puts the card back in COMING UP', async ({ page }) => {
  await page.goto('/dashboard')
  await openMenu(page, 'Saturday study session')
  await page.getByRole('button', { name: 'Pin to top' }).click()
  await openMenu(page, 'Saturday study session')
  await page.getByRole('button', { name: 'Unpin' }).click()
  await expect(page.getByRole('heading', { name: /PINNED/ })).toHaveCount(0)
  await expect(page.locator('section', { hasText: 'COMING UP' })).toContainText(
    'Saturday study session',
  )
})

test('the menu offers Copy invite link', async ({ page }) => {
  await page.goto('/dashboard')
  await openMenu(page, 'Friday dinner after class')
  await expect(page.getByRole('button', { name: 'Copy invite link' }).first()).toBeVisible()
})

test('UP NEXT shows the soonest hangout with a map, the rest sit under day headings', async ({
  page,
}) => {
  await page.goto('/dashboard')
  const next = page.locator('section', { hasText: 'UP NEXT' })
  await expect(next).toContainText('Friday dinner after class')
  await expect(next).toContainText('Fri 16 Oct · 7:00 pm')
  await expect(next.locator('.leaflet-container')).toHaveCount(1)

  const rest = page.locator('section', { hasText: 'COMING UP' })
  await expect(rest).toContainText('Saturday study session')
  await expect(rest.getByRole('heading', { name: 'Sat 24 Oct' })).toBeVisible()
  await expect(rest.locator('.leaflet-container')).toHaveCount(0)
})

test('a hangout that already started is not UP NEXT', async ({ page }) => {
  // an hour after Friday's 7 pm start, Friday is still today, but it isn't next any more
  await page.clock.setFixedTime(new Date('2026-10-16T20:00:00+08:00'))
  await page.goto('/dashboard')
  await expect(page.locator('section', { hasText: 'UP NEXT' })).toContainText(
    'Saturday study session',
  )
  await expect(page.locator('section', { hasText: 'COMING UP' })).toContainText(
    'Friday dinner after class',
  )
})

test('a hangout whose date has passed shows only under Past', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-20T10:00:00+08:00')) // after Friday 16 Oct
  await page.goto('/dashboard')
  await expect(page.getByText('Friday dinner after class')).toHaveCount(0)
  await expect(page.getByText('Saturday study session')).toBeVisible()
  await page.getByRole('button', { name: 'Past' }).click()
  await expect(page.getByText('Friday dinner after class')).toBeVisible()
})

test('chips say whose turn it is', async ({ page }) => {
  await page.goto('/dashboard')
  const voting = page.locator('.card', { hasText: 'Friday dinner after class' })
  await expect(voting).toContainText('Waiting on Surya')
  const collecting = page.locator('.card', { hasText: 'Saturday study session' })
  await expect(collecting).toContainText("Everyone's added")
  await expect(collecting).not.toContainText('Locations ·')
})

test('each card shows the weather at its start time, amber when rain is likely', async ({
  page,
}) => {
  await page.goto('/dashboard')
  const rainy = page.locator('.card', { hasText: 'Friday dinner after class' })
  await expect(rainy).toContainText('Thunderstorms · 70% rain, go indoors')
  const fine = page.locator('.card', { hasText: 'Saturday study session' })
  await expect(fine).toContainText('Clear · 5% rain')
  await expect(fine).not.toContainText('go indoors')
  await expect(fine).not.toContainText('umbrella')
})

test('haze shows once in a banner that can be dismissed, not on the cards', async ({ page }) => {
  await page.goto('/dashboard')
  const banner = page.getByRole('status').filter({ hasText: 'Haze · PSI 140' })
  await expect(banner).toBeVisible()
  await expect(banner).toContainText('Source: NEA')
  await expect(page.locator('.card', { hasText: 'Haze' })).toHaveCount(0)
  await banner.getByRole('button', { name: 'Dismiss haze warning' }).click()
  await expect(banner).toHaveCount(0)
})

test('a hangout starting within 30 minutes shows the crowd at its midpoint station', async ({
  page,
}) => {
  // on the 14th, and earlier on the day, the hangout is far off, so no crowd chip
  await page.goto('/dashboard')
  await expect(page.getByText('Busy crowd')).toHaveCount(0)
  await page.clock.setFixedTime(new Date('2026-10-16T10:00:00+08:00'))
  await page.goto('/dashboard')
  await expect(page.getByText('Busy crowd')).toHaveCount(0)

  // 15 minutes before Friday's 7 pm, Bishan is busy
  await page.clock.setFixedTime(new Date('2026-10-16T18:45:00+08:00'))
  await page.goto('/dashboard')
  const friday = page.locator('.card', { hasText: 'Friday dinner after class' })
  await expect(friday).toContainText('Busy crowd')
  const saturday = page.locator('.card', { hasText: 'Saturday study session' })
  await expect(saturday).not.toContainText('crowd')
})

test('the header counts what is being planned and has no "Your hangouts" heading', async ({
  page,
}) => {
  await page.goto('/dashboard')
  await expect(page.getByText('2 being planned')).toBeVisible()
  await expect(page.getByText('· 0 confirmed')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Your hangouts' })).toHaveCount(0)
})

test('UP NEXT says how soon it is', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.locator('section', { hasText: 'UP NEXT' })).toContainText('In 2 days')
  await page.clock.setFixedTime(new Date('2026-10-16T10:00:00+08:00'))
  await page.goto('/dashboard')
  await expect(page.locator('section', { hasText: 'UP NEXT' })).toContainText('Today · in 9 hours')
})

test('each row shows its step with a bar (wide screens)', async ({ page }) => {
  // Friday is UP NEXT (no step there), so check it once it has started and joined COMING UP
  await page.clock.setFixedTime(new Date('2026-10-16T20:00:00+08:00'))
  await page.goto('/dashboard')
  const voting = page.locator('.card', { hasText: 'Friday dinner after class' })
  await expect(voting).toContainText('Step 5 of 6 · Vote')
  await expect(page.locator('.card.featured')).not.toContainText('Step')
  await page.clock.setFixedTime(new Date('2026-10-14T22:00:00+08:00'))
  await page.goto('/dashboard')
  const collecting = page.locator('.card', { hasText: 'Saturday study session' })
  await expect(collecting).toContainText('Step 1 of 6 · Starting points')
})

test('the step is hidden on a tablet', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 })
  await page.goto('/dashboard')
  await expect(page.getByText('Step 1 of 6')).toBeHidden()
})

test('1400px and wider: the week and its first free day sit beside the list', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/dashboard')
  const week = page.locator('section', { hasText: 'Next 7 days' })
  await expect(week.locator('.day')).toHaveCount(7)
  await expect(week).toContainText('14 Oct – 20 Oct')
  await expect(week).toContainText('Next free day: Thu 15 Oct') // tomorrow has nothing on
  await expect(week.locator('.day.open')).toContainText('15')
  await expect(week.locator('.dots .planning')).toHaveCount(1) // Friday is still being planned
  await expect(week.getByRole('link', { name: 'Start planning' })).toBeVisible()
})

test('below 1400px the rail is hidden', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 })
  await page.goto('/dashboard')
  await expect(page.getByText('Next 7 days')).toBeHidden()
})

test('the week card opens Start planning with the free day filled in', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/dashboard')
  await page
    .locator('section', { hasText: 'Next 7 days' })
    .getByRole('link', { name: 'Start planning' })
    .click()
  await expect(page).toHaveURL(/\/hangouts\/new\?date=2026-10-15/)
  await expect(page.getByLabel('Date')).toHaveValue('2026-10-15')
})

test('rows say how far along people are', async ({ page }) => {
  await page.goto('/dashboard')
  // once everyone has added theirs, "Everyone's added" says it, so no count is repeated
  await expect(page.locator('.card', { hasText: 'Saturday study session' })).not.toContainText(
    'added a starting point',
  )
  await expect(page.locator('.card', { hasText: 'Friday dinner after class' })).toContainText(
    /\d of 4 voted/,
  )
})

test('avatars of people still to vote go grey, and nobody is grey once everyone has acted', async ({
  page,
}) => {
  await page.goto('/dashboard')
  const friday = page.locator('.card', { hasText: 'Friday dinner after class' })
  await expect(friday.locator('.avatar.is-waiting')).not.toHaveCount(0)
  const saturday = page.locator('.card', { hasText: 'Saturday study session' })
  await expect(saturday.locator('.avatar.is-waiting')).toHaveCount(0)
})

test('a confirmed hangout has no step bar', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/dashboard')
  await expect(page.getByText('Step 6 of 6')).toHaveCount(0)
})

test('the map names its midpoint and each person', async ({ page }) => {
  await page.goto('/dashboard')
  const next = page.locator('section', { hasText: 'UP NEXT' })
  await expect(next.locator('.up-next-label')).toHaveText('Bishan')
  await expect(next.locator('.leaflet-marker-icon[title="Surya"]')).toHaveCount(1)
})

test('rain shows its chance', async ({ page }) => {
  // later routes win: a rainy, not thundery, Saturday at 60%
  await page.route('https://api.open-meteo.com/**', (route) =>
    route.fulfill({
      json: {
        hourly: {
          time: ['2026-10-16T19:00', '2026-10-24T14:00'],
          temperature_2m: [30, 28],
          precipitation_probability: [10, 60],
          relative_humidity_2m: [70, 80],
          uv_index: [0, 2],
          weather_code: [0, 3],
          is_day: [0, 1],
        },
      },
    }),
  )
  await page.goto('/dashboard')
  await expect(page.locator('.card', { hasText: 'Saturday study session' })).toContainText(
    '60% rain, bring an umbrella',
  )
})

test('the Needs your input card is hidden for a short list', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/dashboard')
  await expect(page.getByText('Next 7 days')).toBeVisible()
  await expect(page.getByText('Needs your input')).toHaveCount(0)
})

test('one action per card: outline View while waiting on others, no Continue anywhere', async ({
  page,
}) => {
  await page.goto('/dashboard')
  await expect(page.getByRole('link', { name: 'Continue' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'View', exact: true })).toHaveCount(2)
})
