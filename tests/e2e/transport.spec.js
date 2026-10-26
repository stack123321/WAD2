// Owner: Eashvar (testing). Page 07 Transport reminders, from the prof's feedback ("I have to go
// back 1 step to send reminders"): friends who haven't added a starting point or picked a mode get
// a Remind button on 07, and a friend with no starting point says "No starting point yet" instead
// of an empty "From". The sample hangouts give everyone a start and a mode, so these tests serve
// page 07 a copy of the Saturday sample (demo-2) with Matrix missing his starting point and Hugo
// missing his mode. Without a group chat, the demo copies the reminder instead of posting it.
import { test, expect } from '@playwright/test'
import saturday from '../../src/mocks/hangout-2.json' with { type: 'json' }

// Serve the Saturday sample with one friend missing a start and one missing a mode
async function withFriendsToRemind(page) {
  const hangout = structuredClone(saturday)
  for (const m of hangout.members) {
    if (m.display_name === 'Matrix') {
      Object.assign(m, { start_label: null, start_lat: null, start_lng: null, mode: null })
      Object.assign(m, { travel_mins: null, travel_cost: null })
    }
    if (m.display_name === 'Hugo') {
      Object.assign(m, { mode: null })
    }
  }
  await page.route('**/src/mocks/hangout-2.json*', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `export default ${JSON.stringify(hangout)}`,
    }),
  )
}

const row = (page, name) => page.locator('.person', { hasText: name })

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await withFriendsToRemind(page)
  await page.goto('/hangouts/demo-2/transport')
})

test('a friend with no starting point says so and can be reminded', async ({ page }) => {
  await expect(row(page, 'Matrix').getByText('No starting point yet')).toBeVisible()
  await expect(row(page, 'Matrix').getByText('From', { exact: false })).toHaveCount(0)
  await expect(row(page, 'Matrix').getByRole('button', { name: 'Remind' })).toBeVisible()
})

test('Remind copies a message asking them to add where they’re coming from', async ({ page }) => {
  await row(page, 'Matrix').getByRole('button', { name: 'Remind' }).click()

  await expect(row(page, 'Matrix').getByRole('button', { name: 'Copied ✓' })).toBeDisabled()
  await expect(page.getByText('Copied the reminder. Paste it to them')).toBeVisible()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied).toContain(
    '@Matrix, please add where you\'re coming from for "Saturday study session"',
  )
  expect(copied).toContain('/login?invite=')
})

test('a friend with a start but no mode is reminded to pick one', async ({ page }) => {
  await expect(row(page, 'Hugo').getByText('From Punggol', { exact: false })).toBeVisible()
  await row(page, 'Hugo').getByRole('button', { name: 'Remind' }).click()

  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied).toContain(
    '@Hugo, please pick how you\'re getting there for "Saturday study session"',
  )
})

test('nobody who is all set gets a Remind button', async ({ page }) => {
  // Eashvar has both a start and a mode, so only Matrix and Hugo can be reminded
  await expect(row(page, 'Eashvar').getByRole('button', { name: 'Remind' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Remind' })).toHaveCount(2)
})
