// Owner: Eashvar (testing). The three cards fanned over the landing page's hero.
// Logged out (the tests run without Supabase, so nobody is logged in): "Right now in Singapore",
// with MRT crowds and the weather from faked APIs, and an explanation instead of sample crowds.
// Logged in: utils/heroCards.js, run in the browser on the sample hangouts, picks the right hangout
// and says only what's true for it at each step (the live version is in tests/live).
import { test, expect } from '@playwright/test'

// 22:00 on Wed 14 Oct, Singapore time
const NOW = '2026-10-14T22:00:00+08:00'

function fakeWeather(page) {
  return Promise.all([
    page.route('https://api.open-meteo.com/**', (route) =>
      route.fulfill({
        json: {
          hourly: {
            time: [
              '2026-10-14T22:00',
              '2026-10-14T23:00',
              '2026-10-15T00:00',
              '2026-10-15T01:00',
              '2026-10-15T02:00',
            ],
            temperature_2m: [28, 28, 27, 27, 26],
            precipitation_probability: [20, 10, 10, 5, 5],
            relative_humidity_2m: [80, 82, 84, 85, 86],
            uv_index: [0, 0, 0, 0, 0],
            weather_code: [2, 2, 1, 1, 0],
            is_day: [0, 0, 0, 0, 0],
          },
        },
      }),
    ),
    page.route('https://api-open.data.gov.sg/**', (route) =>
      route.fulfill({
        json: {
          code: 0,
          data: { items: [{ readings: { psi_twenty_four_hourly: { north: 54, south: 48 } } }] },
        },
      }),
    ),
  ])
}

test.describe('logged out: Singapore right now', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date(NOW))
    await fakeWeather(page)
  })

  test('shows the busiest MRT stations, the weather and your group, with nobody made up', async ({
    page,
  }) => {
    await page.route('**/api/crowd**', (route) =>
      route.fulfill({
        json: [
          { station: 'Dhoby Ghaut', lat: 1.299, lng: 103.8456, level: 'h' },
          { station: 'Bishan', lat: 1.351, lng: 103.8485, level: 'm' },
          { station: 'Marymount', lat: 1.3487, lng: 103.8393, level: 'l' },
          { station: 'Caldecott', lat: 1.3375, lng: 103.8394, level: 'l' },
        ],
      }),
    )
    await page.goto('/')

    const fan = page.getByRole('img', { name: /^Right now in Singapore/ })
    await expect(fan).toHaveAccessibleName(
      'Right now in Singapore; busiest MRT stations: Dhoby Ghaut, Bishan; 28°C, partly cloudy; haze PSI 54, moderate.',
    )
    await expect(page.getByText('MRT crowds right now', { exact: true })).toBeVisible()
    await expect(page.getByText('Dhoby Ghaut')).toBeVisible()
    await expect(page.getByText('2 quiet')).toBeVisible()
    await expect(page.getByText('28°C')).toBeVisible()
    await expect(page.getByText('Your group', { exact: true })).toBeVisible()
    // none of the old sample people or places in the hero
    await expect(page.locator('section.hero').getByText('Brew & Board Café')).toHaveCount(0)
  })

  test('explains crowds instead of showing sample levels when LTA is unavailable', async ({
    page,
  }) => {
    await page.route('**/api/crowd**', (route) =>
      route.fulfill({
        json: [{ station: 'Bishan (sample)', lat: 1.351, lng: 103.8485, level: 'h' }],
      }),
    )
    await page.goto('/')

    await expect(page.getByText('Fairpoint checks how busy each MRT station is')).toBeVisible()
    await expect(page.getByText('Bishan (sample)')).toHaveCount(0)
  })

  test('explains the weather if the forecast can’t load', async ({ page }) => {
    await page.route('**/api/crowd**', (route) => route.fulfill({ json: [] }))
    await page.route('https://api.open-meteo.com/**', (route) => route.abort())
    await page.goto('/')

    await expect(
      page.getByText('Fairpoint checks the forecast and haze for when you meet'),
    ).toBeVisible()
  })
})

// runs utils/heroCards.js in the page (Vite resolves its imports) on the sample hangouts
async function heroCardsFor(page, change, myId = 'u-ryan', now = NOW) {
  await page.goto('/')
  return page.evaluate(
    async ({ change, myId, now }) => {
      const { buildHeroCards, pickHeroHangout } = await import('/src/utils/heroCards.js')
      const sample = structuredClone((await import('/src/mocks/hangout.json')).default)
      new Function('h', change)(sample)
      const pick = pickHeroHangout([sample], new Date(now))
      return pick && buildHeroCards(pick.hangout, myId, pick.when, new Date(now))
    },
    { change, myId, now },
  )
}

test.describe('logged in: your own hangout', () => {
  test('during the vote: everyone’s trips, the leader and who hasn’t voted', async ({ page }) => {
    const cards = await heroCardsFor(page, '')

    expect(cards.label).toBe('Up next')
    expect(cards.date).toBe('Fri 16 Oct')
    expect(cards.link).toEqual({ name: 'vote', params: { id: 'demo' } })
    expect(cards.trips.kind).toBe('trips')
    expect(cards.trips.gap).toBe(9)
    expect(cards.trips.rows[0].name).toBe('You') // you come first
    expect(cards.trips.rows.find((r) => r.longest).name).toBe('Nicole')
    expect(cards.spot).toMatchObject({
      kind: 'spot',
      label: 'Leading, not confirmed',
      name: 'Mock Cafe (sample data)',
      leave: '6:26 pm',
    })
    expect(cards.vote.kind).toBe('tally')
    expect(cards.vote.footer).toContain('waiting on Surya')
    expect(cards.summary).toContain('Your next hangout, Friday dinner after class')
  })

  test('after it’s done: where you went and how you decided, opening the debrief', async ({
    page,
  }) => {
    const cards = await heroCardsFor(
      page,
      "h.status = 'done'; h.final_shortlist_id = 'demo-spot-1'",
      'u-ryan',
      '2026-10-20T12:00:00+08:00',
    )

    expect(cards.label).toBe('Last time')
    expect(cards.link.name).toBe('debrief')
    expect(cards.spot).toMatchObject({
      label: 'Where you went',
      name: 'Mock Cafe (sample data)',
      leave: null,
    })
    expect(cards.vote.title).toBe('How you decided')
    expect(cards.vote.rows[0].picked).toBe(true)
    expect(cards.vote.footer).toBe('Runner-up: Mock Board Game Cafe (sample data)')
  })

  test('before anyone has a travel time: who still needs to add a start', async ({ page }) => {
    const cards = await heroCardsFor(
      page,
      "h.status = 'collecting'; h.midpoint_name = null; h.midpoint_lat = null; h.shortlist = []; h.votes = [];" +
        'h.members.forEach((m) => { m.travel_mins = null }); h.members[1].start_lat = null; h.members[2].start_lat = null',
    )

    expect(cards.trips).toMatchObject({
      kind: 'starts',
      added: 2,
      total: 4,
      missingText: 'Waiting on Nicole and Surya',
    })
    expect(cards.spot).toMatchObject({
      kind: 'plan',
      label: 'Friday dinner after class',
      midpoint: 'Finding the fair midpoint',
      leave: null,
    })
    expect(cards.vote).toMatchObject({
      kind: 'next',
      count: 0,
      next: 'Everyone adds where they’re starting',
    })
    expect(cards.link.name).toBe('starting-points')
  })

  test('with a midpoint but no spots yet: what to add next', async ({ page }) => {
    const cards = await heroCardsFor(
      page,
      "h.status = 'collecting'; h.shortlist = []; h.votes = []",
    )

    expect(cards.spot).toMatchObject({ kind: 'plan', midpoint: 'Meeting near Bishan' })
    expect(cards.vote.next).toBe('Add up to 3 spots near Bishan')
    expect(cards.link.name).toBe('explore')
  })

  test('picks the next hangout over a past one, and the latest past one if none is coming', async ({
    page,
  }) => {
    await page.goto('/')
    const picked = await page.evaluate(async () => {
      const { pickHeroHangout } = await import('/src/utils/heroCards.js')
      const at = (id, starts, status = 'voting') => ({ id, starts_at: starts, status })
      const now = new Date('2026-10-14T22:00:00+08:00')
      return [
        pickHeroHangout(
          [
            at('old', '2026-10-01T19:00:00+08:00', 'done'),
            at('soon', '2026-10-16T19:00:00+08:00'),
            at('later', '2026-10-24T14:00:00+08:00'),
          ],
          now,
        ),
        pickHeroHangout(
          [
            at('older', '2026-09-20T19:00:00+08:00', 'done'),
            at('newer', '2026-10-09T19:00:00+08:00', 'done'),
          ],
          now,
        ),
        pickHeroHangout([], now),
        // a past hangout that was never decided isn't shown
        pickHeroHangout([at('undecided', '2026-10-09T19:00:00+08:00', 'voting')], now),
      ]
    })
    expect(picked[0]).toMatchObject({ hangout: { id: 'soon' }, when: 'upcoming' })
    expect(picked[1]).toMatchObject({ hangout: { id: 'newer' }, when: 'past' })
    expect(picked[2]).toBeNull()
    expect(picked[3]).toBeNull()
  })
})
