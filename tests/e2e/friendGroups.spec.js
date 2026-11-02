// Owner: Eashvar. Friend groups on the sample data (src/mocks/groups.json). In the demo you're
// Surya: owner of "Class project crew" (Ryan, Nicole, Hugo; the Friday dinner was planned with it)
// and a member of "Study buddies" (nothing planned yet). A group shows on My Chats, opens its own
// page with its hangouts, chat and everyone's usual starting point, and "Plan a hangout with this
// group" opens 05 with everyone ticked. /api/search is faked so place search always gives Bishan.
import { test, expect } from '@playwright/test'

const BISHAN = {
  label: 'Bishan MRT',
  address: 'Bishan MRT',
  lat: 1.3508,
  lng: 103.8485,
  postal: null,
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-14T22:00:00+08:00'))
  await page.route('**/api/search**', (route) => route.fulfill({ json: [BISHAN] }))
})

const person = (page, name) => page.locator('.person').filter({ hasText: name })

test('My Chats lists my groups and opens one', async ({ page }) => {
  await page.goto('/chats')
  const groups = page.getByRole('region', { name: 'Groups' })
  await expect(groups.getByRole('link', { name: /Class project crew/ })).toBeVisible()
  await expect(groups.getByRole('link', { name: /Study buddies/ })).toBeVisible()
  // the Friday dinner's chat is tagged with the group it was planned with
  await expect(
    page.locator('#chat-list .person', { hasText: 'Friday dinner after class' }),
  ).toContainText('Class project crew')

  await groups.getByRole('link', { name: /Class project crew/ }).click()
  await expect(page).toHaveURL('/groups/demo-group-1')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Class project crew')
})

test('searching My Chats filters the groups too', async ({ page }) => {
  await page.goto('/chats')
  await page.getByLabel('Search by hangout or person').fill('Matrix')
  const groups = page.getByRole('region', { name: 'Groups' })
  await expect(groups.getByRole('link', { name: /Study buddies/ })).toBeVisible()
  await expect(groups.getByRole('link', { name: /Class project crew/ })).toHaveCount(0)
})

test('a group shows its hangouts, its chat and everyone’s usual starting point', async ({
  page,
}) => {
  await page.goto('/groups/demo-group-1')
  const hangouts = page.getByRole('region', { name: 'Hangouts' })
  await expect(hangouts.getByRole('link', { name: 'Friday dinner after class' })).toBeVisible()
  await expect(hangouts).toContainText('4 going')
  await hangouts.getByRole('button', { name: /Past/ }).click()
  await expect(hangouts).toContainText('No past hangouts with this group yet.')

  await expect(page.getByText('Chat works in real groups.')).toBeVisible()

  // a saved usual start, or the one they used in the group's last hangout
  await expect(person(page, 'Ryan')).toContainText('Tampines MRT · MRT')
  await expect(person(page, 'Hugo')).toContainText('Punggol MRT · Car')
  await expect(person(page, 'Hugo')).toContainText('from the last hangout')
  await expect(person(page, 'You')).toContainText('Woodlands MRT · Bus')
})

test('a group with nothing planned says so and offers to plan one', async ({ page }) => {
  await page.goto('/groups/demo-group-2')
  const hangouts = page.getByRole('region', { name: 'Hangouts' })
  await expect(hangouts).toContainText('Nothing planned with this group yet.')
  await expect(hangouts.getByRole('link', { name: 'Plan the first one' })).toHaveAttribute(
    'href',
    '/hangouts/new?group=demo-group-2',
  )
  // not the owner: can leave, can't add or remove people
  await expect(page.getByRole('button', { name: 'Leave group' })).toBeVisible()
  await expect(page.getByRole('button', { name: '+ Add people' })).toHaveCount(0)
})

test('I can set my usual starting point and transport', async ({ page }) => {
  await page.goto('/groups/demo-group-1')
  await page.getByRole('button', { name: 'Set your usual starting point' }).click()
  await page.getByRole('combobox').fill('Bishan')
  await page.getByRole('option', { name: /Bishan MRT/ }).click()
  await page.getByRole('button', { name: 'MRT', exact: true }).click()
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(person(page, 'You')).toContainText('Bishan MRT · MRT')
  await expect(person(page, 'You')).not.toContainText('from the last hangout')
  await expect(page.getByRole('button', { name: 'Change your usual starting point' })).toBeVisible()
})

test('planning with a group ticks everyone, and anyone can be left out', async ({ page }) => {
  await page.goto('/groups/demo-group-1')
  await page.getByRole('link', { name: 'Plan a hangout with this group' }).click()
  await expect(page).toHaveURL('/hangouts/new?group=demo-group-1')

  const banner = page.getByRole('status').filter({ hasText: 'Planning with Class project crew' })
  await expect(banner).toContainText('4 usual starting points are filled in')
  for (const name of ['Ryan', 'Nicole', 'Hugo']) {
    await expect(page.getByRole('checkbox', { name: new RegExp(name) })).toBeChecked()
  }

  // Hugo can't make it this time: he's left out, and so is his starting point
  await page.getByRole('checkbox', { name: /Hugo/ }).uncheck()
  await expect(banner).toContainText('3 usual starting points are filled in')
})

test('usual starts come from the group first, then the last hangout', async ({ page }) => {
  await page.goto('/chats')
  const trips = await page.evaluate(async () => {
    const { usualTrips } = await import('/src/services/groups.js')
    const group = {
      members: [
        { user_id: 'a', start_label: 'Bedok MRT', start_lat: 1.32, start_lng: 103.93, mode: null },
        { user_id: 'b', start_label: null, start_lat: null, start_lng: null, mode: 'walk' },
        { user_id: 'c', start_label: null, start_lat: null, start_lng: null, mode: null },
      ],
    }
    const row = (id, label, mode) => ({
      user_id: id,
      start_label: label,
      start_lat: 1.3,
      start_lng: 103.8,
      mode,
    })
    const hangouts = [
      {
        starts_at: '2026-09-01T19:00:00+08:00',
        members: [row('a', 'Old', 'bus'), row('b', 'Old B', 'bus')],
      },
      { starts_at: '2026-10-01T19:00:00+08:00', members: [row('b', 'Newer B', 'car')] },
    ]
    return usualTrips(group, hangouts)
  })
  expect(trips.a).toMatchObject({ label: 'Bedok MRT', mode: null, fromLast: false })
  // b never saved one: the most recent hangout's start, with b's own usual mode kept
  expect(trips.b).toMatchObject({ label: 'Newer B', mode: 'walk', fromLast: true })
  expect(trips.c).toBeNull()
})

test('making a new group opens it and lists it on My Chats', async ({ page }) => {
  await page.goto('/chats')
  await page.getByRole('link', { name: '+ New group' }).click()
  await expect(page).toHaveURL('/groups/new')
  await expect(page.getByRole('button', { name: 'Create group' })).toBeDisabled()

  await page.getByLabel('Group name').fill('Badminton')
  await page.getByRole('checkbox', { name: /Ryan/ }).check()
  await expect(page.getByText('You and 1 more')).toBeVisible()
  await page.getByRole('button', { name: 'Create group' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Badminton')
  await expect(person(page, 'Ryan')).toBeVisible()
  await expect(person(page, 'You')).toContainText('Owner')

  // the owner adds someone else
  await page.getByRole('button', { name: '+ Add people' }).click()
  await page.getByRole('checkbox', { name: /Nicole/ }).check()
  await page.getByRole('button', { name: 'Add 1' }).click()
  await expect(person(page, 'Nicole')).toBeVisible()

  await page.getByRole('link', { name: '← My Chats' }).click()
  await expect(
    page.getByRole('region', { name: 'Groups' }).getByRole('link', { name: /Badminton/ }),
  ).toBeVisible()
})

test('the owner can take someone out, and a member can leave', async ({ page }) => {
  await page.goto('/chats')
  const groups = page.getByRole('region', { name: 'Groups' })
  await groups.getByRole('link', { name: /Class project crew/ }).click()
  await page.getByRole('button', { name: 'Remove Hugo' }).click()
  await page.getByRole('group').getByRole('button', { name: 'Remove', exact: true }).click()
  await expect(person(page, 'Hugo')).toHaveCount(0)

  await page.getByRole('link', { name: '← My Chats' }).click()
  await groups.getByRole('link', { name: /Study buddies/ }).click()
  await page.getByRole('button', { name: 'Leave group' }).click()
  await page.getByRole('button', { name: 'Leave', exact: true }).click()
  await expect(page).toHaveURL('/chats')
  await expect(page.getByRole('link', { name: /Study buddies/ })).toHaveCount(0)
})

test('group pages fit a phone: no sideways scroll, buttons easy to tap', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  for (const url of ['/groups/demo-group-1', '/groups/new']) {
    await page.goto(url)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const sideways = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(sideways, url).toBe(false)
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('main .btn, main button')]
        .filter((b) => b.offsetParent !== null && b.getBoundingClientRect().height < 40)
        .map((b) => b.textContent.trim()),
    )
    expect(small, url).toEqual([])
  }
})
