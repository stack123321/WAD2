// Owner: Eashvar (testing). The Ask box on 09 Nearby spots ("prata for dinner, one of us is
// halal"). /api/assistant and /api/places are stubbed, so these never call Gemini or Google and
// run without keys. Google Places is switched on for each test, as the Ask box follows that switch.
import { test, expect } from '@playwright/test'
import friday from '../../src/mocks/hangout.json' with { type: 'json' }

const place = (id, name, extra = {}) => ({
  source: 'google',
  source_place_id: id,
  name,
  category: 'food',
  types: ['restaurant'],
  lat: 1.3512,
  lng: 103.8489,
  rating: 4.4,
  review_count: 210,
  price_level: 1,
  image_url: null,
  distance_m: 300,
  nearest_station_name: 'Bishan',
  station_distance_m: 300,
  tags: ['Good for groups'],
  ...extra,
})

const PRATA = {
  reply: 'Found 3 spots for "prata" within a 10 min walk of Bishan, open at 7:00 pm.',
  query: 'prata',
  places: [
    place('prata-1', 'Test Prata House'),
    place('prata-2', 'Test Roti Corner', { distance_m: 450 }),
    place('prata-3', 'Test Supper Spot', { distance_m: 700 }),
  ],
  suggestOtherStations: false,
}

const FEW = {
  reply:
    'Found 1 spot for "murtabak" within a 5 min walk of Bishan. Not many here, so another station might suit you better.',
  query: 'murtabak',
  places: [place('murtabak-1', 'Test Murtabak Stall')],
  suggestOtherStations: true,
}

// Answers /api/assistant with the given replies in turn, and remembers what the page sent
async function stubAssistant(page, ...replies) {
  const sent = []
  await page.route('**/api/assistant', (route) => {
    sent.push(route.request().postDataJSON())
    const reply = replies[Math.min(sent.length - 1, replies.length - 1)]
    return reply.status
      ? route.fulfill({ status: reply.status, json: { error: reply.error } })
      : route.fulfill({ json: reply })
  })
  return sent
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    window.localStorage.setItem('fairpoint.googlePlacesEnabled', 'true'),
  )
  await page.route('**/api/places**', (route) =>
    route.fulfill({ json: [place('test-cafe', 'Test Cafe', { category: 'cafe' })] }),
  )
})

const askBox = (page) => page.getByRole('textbox', { name: 'Ask for something specific' })

test('asking swaps the cards for spots that fit the request', async ({ page }) => {
  await stubAssistant(page, PRATA)
  await page.goto('/hangouts/demo/explore')
  await expect(page.getByRole('link', { name: 'Test Cafe', exact: true })).toBeVisible()

  await askBox(page).fill('prata for dinner')
  await page.getByRole('button', { name: 'Ask', exact: true }).click()

  await expect(page.getByText(PRATA.reply)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Test Prata House', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Test Supper Spot', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Test Cafe', exact: true })).toHaveCount(0)
  // the category filters are for the usual list, so they step aside
  await expect(page.getByRole('button', { name: 'Cafes' })).toHaveCount(0)
  await expect(askBox(page)).toHaveValue('')
})

test('"Show all spots" brings the usual list back', async ({ page }) => {
  await stubAssistant(page, PRATA)
  await page.goto('/hangouts/demo/explore')
  await askBox(page).fill('prata for dinner')
  await askBox(page).press('Enter')
  await expect(page.getByRole('link', { name: 'Test Prata House', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Show all spots' }).click()

  await expect(page.getByRole('link', { name: 'Test Cafe', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Test Prata House', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Cafes' })).toBeVisible()
})

test('the whole group is taken into account, without sending anyone’s name', async ({ page }) => {
  const sent = await stubAssistant(page, PRATA)
  await page.goto('/hangouts/demo/explore')
  // the sample group has 4 people, and Surya's budget is the lowest (under $15)
  await expect(page.getByText('For 4 people · under $15 each')).toBeVisible()

  await askBox(page).fill('prata for dinner')
  await askBox(page).press('Enter')
  await expect(page.getByText(PRATA.reply)).toBeVisible()

  expect(sent[0]).toMatchObject({
    message: 'prata for dinner',
    midpoint: { name: 'Bishan' },
    needs: { size: 4, dietary: [], maxPrice: 1 },
  })
  for (const name of ['Ryan', 'Nicole', 'Surya', 'Hugo']) {
    expect(JSON.stringify(sent[0])).not.toContain(name)
  }
})

// Serve the Friday sample with Ryan eating halal
async function withHalalMember(page) {
  const hangout = structuredClone(friday)
  hangout.members.find((m) => m.display_name === 'Ryan').dietary = ['halal']
  await page.route('**/src/mocks/hangout.json*', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `export default ${JSON.stringify(hangout)}`,
    }),
  )
}

test('a group member’s dietary need is a button that starts off', async ({ page }) => {
  await withHalalMember(page)
  const sent = await stubAssistant(page, PRATA, PRATA)
  await page.goto('/hangouts/demo/explore')
  const halal = page.getByRole('button', { name: 'Halal only' })
  await expect(halal).toHaveAttribute('aria-pressed', 'false')

  // "a cafe for us" shouldn't turn into a halal search on its own
  await askBox(page).fill('find a cafe for us')
  await askBox(page).press('Enter')
  await expect(page.getByText(PRATA.reply)).toBeVisible()
  expect(sent[0].needs.dietary).toEqual([])

  // switching it on redoes the same question, now halal only
  await halal.click()
  await expect(halal).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => sent.length).toBe(2)
  expect(sent[1]).toMatchObject({ message: 'find a cafe for us', history: [] })
  expect(sent[1].needs.dietary).toEqual(['halal'])
})

test('a follow-up sends the earlier search along with it', async ({ page }) => {
  const sent = await stubAssistant(page, PRATA, FEW)
  await page.goto('/hangouts/demo/explore')
  await askBox(page).fill('prata for dinner')
  await askBox(page).press('Enter')
  await expect(page.getByText(PRATA.reply)).toBeVisible()

  await page.getByRole('button', { name: 'Closer to the MRT' }).click()

  await expect(page.getByText(FEW.reply)).toBeVisible()
  expect(sent[1].message).toBe('Closer to the MRT')
  expect(sent[1].history).toEqual([
    { role: 'user', text: 'prata for dinner' },
    { role: 'model', text: PRATA.reply },
  ])
})

test('when only a few spots turn up, it offers another station on 08', async ({ page }) => {
  await stubAssistant(page, FEW)
  await page.goto('/hangouts/demo/explore')
  await askBox(page).fill('murtabak right next to the MRT')
  await askBox(page).press('Enter')
  await expect(page.getByRole('link', { name: 'Test Murtabak Stall', exact: true })).toBeVisible()

  await page.getByRole('link', { name: 'Try another station' }).click()
  await expect(page).toHaveURL('/hangouts/demo/midpoint')
})

test('a spot found by asking can be added to the vote shortlist', async ({ page }) => {
  await stubAssistant(page, PRATA)
  await page.goto('/hangouts/demo/explore')
  await askBox(page).fill('prata for dinner')
  await askBox(page).press('Enter')

  const card = page.locator('article', { hasText: 'Test Roti Corner' })
  await card.getByRole('button', { name: 'Add to vote' }).click()

  await expect(card.getByRole('button', { name: 'Added to vote' })).toBeDisabled()
  await expect(page.locator('.shortlist-list')).toContainText('Test Roti Corner')
})

test('if the assistant fails, it says so and the usual list stays', async ({ page }) => {
  await stubAssistant(page, {
    status: 429,
    error: 'The assistant is busy right now. Try again in a minute.',
  })
  await page.goto('/hangouts/demo/explore')
  await askBox(page).fill('prata for dinner')
  await askBox(page).press('Enter')

  await expect(page.getByRole('alert')).toHaveText(
    'The assistant is busy right now. Try again in a minute.',
  )
  await expect(page.getByRole('link', { name: 'Test Cafe', exact: true })).toBeVisible()
  await expect(askBox(page)).toHaveValue('prata for dinner')
})

test('with Google Places off, the Ask box is off too', async ({ page }) => {
  await page.addInitScript(() =>
    window.localStorage.setItem('fairpoint.googlePlacesEnabled', 'false'),
  )
  await page.goto('/hangouts/demo/explore')

  await expect(askBox(page)).toBeDisabled()
  await expect(page.getByText('Turn on Google Places above to ask.')).toBeVisible()
})

test('on a phone the Ask box fits and its buttons are easy to tap', async ({ page }) => {
  await stubAssistant(page, PRATA)
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/hangouts/demo/explore')
  await askBox(page).fill('prata for dinner')
  await askBox(page).press('Enter')
  await expect(page.getByText(PRATA.reply)).toBeVisible()

  const scrollsSideways = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(scrollsSideways).toBe(false)
  for (const name of ['Ask', 'Cheaper', 'Closer to the MRT', 'Something else', 'Show all spots']) {
    const box = await page.getByRole('button', { name, exact: true }).boundingBox()
    expect(box.height).toBeGreaterThanOrEqual(44)
  }
})

test('/api/assistant only takes a POST with a message and a midpoint', async ({ request }) => {
  expect((await request.get('/api/assistant')).status()).toBe(405)

  const empty = await request.post('/api/assistant', {
    data: { message: '  ', midpoint: { name: 'Bishan', lat: 1.3508, lng: 103.8485 } },
  })
  expect(empty.status()).toBe(400)

  const tooLong = await request.post('/api/assistant', {
    data: { message: 'a'.repeat(301), midpoint: { name: 'Bishan', lat: 1.3508, lng: 103.8485 } },
  })
  expect(tooLong.status()).toBe(400)

  const noMidpoint = await request.post('/api/assistant', { data: { message: 'prata' } })
  expect(noMidpoint.status()).toBe(400)
})
