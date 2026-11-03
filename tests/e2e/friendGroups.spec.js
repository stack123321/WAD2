// Owner: Eashvar. Friend groups on the sample data (src/mocks/groups.json). In the demo you're
// Surya: owner of "Class project crew" (Ryan, Nicole, Hugo; the Friday dinner was planned with it)
// and a member of "Study buddies" (nothing planned yet). A group shows on My Chats, opens its own
// page with its hangouts, chat and everyone's usual starting point, and "Plan a hangout with this
// group" opens 05 with everyone ticked. Place search uses the sample addresses /api/search gives
// without keys. How the usual starts are worked out has unit tests (src/services/__tests__).
import { test, expect } from '@playwright/test'
import { setTime, VOTING_OPEN } from './helpers/clock.js'
import { onPhone } from './helpers/phone.js'

// the sample hangouts are dated October 2026, so the clock is set to before the Friday dinner
async function open(page, url) {
  await setTime(page, VOTING_OPEN)
  await page.goto(url)
}

// someone's row in the group's People list
const person = (page, name) =>
  page.getByRole('region', { name: 'People' }).getByRole('listitem').filter({ hasText: name })

test('My Chats lists my groups and opens one', async ({ page }) => {
  await open(page, '/chats')
  const groups = page.getByRole('region', { name: 'Groups' })
  await expect(groups.getByRole('link', { name: /Class project crew/ })).toBeVisible()
  await expect(groups.getByRole('link', { name: /Study buddies/ })).toBeVisible()
  // the Friday dinner's chat is tagged with the group it was planned with
  await expect(page.getByRole('link', { name: /Friday dinner after class/ })).toContainText(
    'Class project crew',
  )

  await groups.getByRole('link', { name: /Class project crew/ }).click()
  await expect(page).toHaveURL('/groups/demo-group-1')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Class project crew')
})

test('searching My Chats filters the groups too', async ({ page }) => {
  await open(page, '/chats')
  await page.getByLabel('Search by hangout or person').fill('Matrix')
  const groups = page.getByRole('region', { name: 'Groups' })
  await expect(groups.getByRole('link', { name: /Study buddies/ })).toBeVisible()
  await expect(groups.getByRole('link', { name: /Class project crew/ })).toHaveCount(0)
})

test('a group shows its hangouts, its chat and everyone’s usual starting point', async ({
  page,
}) => {
  await open(page, '/groups/demo-group-1')
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
  await open(page, '/groups/demo-group-2')
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
  await open(page, '/groups/demo-group-1')
  await page.getByRole('button', { name: 'Set your usual starting point' }).click()
  await page.getByRole('combobox').fill('Bishan')
  await page.getByRole('option', { name: /Bishan MRT/ }).click()
  await page.getByRole('button', { name: 'MRT', exact: true }).click()
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(person(page, 'You')).toContainText('Bishan MRT (sample) · MRT')
  await expect(person(page, 'You')).not.toContainText('from the last hangout')
  await expect(page.getByRole('button', { name: 'Change your usual starting point' })).toBeVisible()
})

test('planning with a group ticks everyone, and anyone can be left out', async ({ page }) => {
  await open(page, '/groups/demo-group-1')
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

test('making a new group opens it and lists it on My Chats', async ({ page }) => {
  await open(page, '/chats')
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
  await open(page, '/chats')
  const groups = page.getByRole('region', { name: 'Groups' })
  await groups.getByRole('link', { name: /Class project crew/ }).click()
  await page.getByRole('button', { name: 'Remove Hugo' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Remove', exact: true }).click()
  await expect(person(page, 'Hugo')).toHaveCount(0)

  await page.getByRole('link', { name: '← My Chats' }).click()
  await groups.getByRole('link', { name: /Study buddies/ }).click()
  await page.getByRole('button', { name: 'Leave group' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Leave group' }).click()
  await expect(page).toHaveURL('/chats')
  await expect(page.getByRole('link', { name: /Study buddies/ })).toHaveCount(0)
})

test('on a phone a group can be opened and a hangout planned from it', async ({ page }) => {
  await onPhone(page)
  await open(page, '/chats')

  await page
    .getByRole('region', { name: 'Groups' })
    .getByRole('link', { name: /Class project crew/ })
    .click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Class project crew')
  await expect(person(page, 'Ryan')).toBeVisible()

  await page.getByRole('link', { name: 'Plan a hangout with this group' }).click()
  await expect(page).toHaveURL('/hangouts/new?group=demo-group-1')
  await expect(page.getByRole('button', { name: /Create/ })).toBeVisible()
})
