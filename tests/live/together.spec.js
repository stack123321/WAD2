// Owner: Eashvar (testing). Two real people in one hangout, against the real Supabase project
// (npm run test:live), each in their own browser: someone who isn't in the hangout can't even
// open it (the database only lets members read a hangout); the invite link adds them, and the
// host sees them on 06 after reloading; both add a starting point and a mode and the host finds
// the midpoint (09–12 need all three); and a whole vote (spots added on 09, vote started, the
// friend votes, the host sees it live and closes it) reaches the final plan for both. Needs
// E2E_EMAIL_2 / E2E_PASSWORD_2 too (tests/live/helpers.js); skipped without them (test.skip).
// The hangout is deleted at the end. Each person gets their own browser (browser.newContext), so
// two people are logged in at once; that isn't covered in the course, but it's the only way to
// test two real people together.
import { test, expect } from '@playwright/test'
import {
  copyInviteLink,
  createHangout,
  deleteHangout,
  friend,
  hasFriend,
  host,
  logIn,
  setMyTrip,
  spot,
  stubSpots,
} from './helpers.js'

test.skip(!hasFriend, 'Add E2E_EMAIL_2 and E2E_PASSWORD_2 (a second test account) to .env.local')
// two people, the real database, OneMap's travel times and live updates take longer
test.setTimeout(240000)

const SPOT_A = spot('e2e-live-spot-a', 'E2E Live Spot A')
const SPOT_B = spot('e2e-live-spot-b', 'E2E Live Spot B')

test('an invited friend joins, votes, and both see the final plan', async ({ browser }) => {
  const hostContext = await browser.newContext()
  const friendContext = await browser.newContext()
  const hostPage = await hostContext.newPage()
  const friendPage = await friendContext.newPage()

  await logIn(hostPage, host)
  await logIn(friendPage, friend)
  const { name, id } = await createHangout(hostPage)

  try {
    // Before joining, the friend can't open the hangout's pages at all: the database only lets
    // members read a hangout ("hangouts: members read" in the database)
    await friendPage.goto(`/hangouts/${id}/start`)
    await expect(friendPage.getByText("Couldn't load this hangout", { exact: false })).toBeVisible()
    await friendPage.goto(`/hangouts/${id}/vote`)
    await expect(friendPage.getByText("Couldn't load this hangout", { exact: false })).toBeVisible()

    // The host keeps 06 open, where the group is just them; the friend joins with the invite link
    const invite = await copyInviteLink(hostPage, hostContext, name)
    await hostPage.goto(`/hangouts/${id}/start`)
    await expect(hostPage.getByText('of 1 added', { exact: false })).toBeVisible()

    await friendPage.goto(invite)
    await expect(friendPage).toHaveURL(`/hangouts/${id}/start`)

    // The host sees the group become two after reloading. (06 doesn't listen for people joining:
    // subscribeToMembers in services/hangouts.js only hears changes to existing members, and
    // nothing calls it yet.)
    await hostPage.reload()
    await expect(hostPage.getByText('of 2 added', { exact: false })).toBeVisible()

    // 09–12 open only once you have a starting point and a mode and the group has a midpoint
    // (composables/useHangoutPrerequisites.js). OneMap's times pick the station, so stubSpots puts
    // the fake spots wherever the midpoint ends up
    await setMyTrip(hostPage, id)
    await setMyTrip(friendPage, id)
    await hostPage.goto(`/hangouts/${id}/transport`)
    // the button stays greyed out while OneMap works out 8 stations × 2 trips, so it gets longer
    await hostPage.getByRole('button', { name: /Find our midpoint/ }).click({ timeout: 90000 })
    await expect(hostPage).toHaveURL(`/hangouts/${id}/midpoint`)

    // The host puts two spots on the shortlist from 09 Nearby spots (Google is faked), then
    // follows the Go Vote! link: a link doesn't reload the page, so both saves can finish
    await stubSpots(hostPage, [SPOT_A, SPOT_B])
    await hostPage.goto(`/hangouts/${id}/explore`)
    for (const s of [SPOT_A, SPOT_B]) {
      const card = hostPage.getByRole('article').filter({ hasText: s.name })
      await card.getByRole('button', { name: 'Add to vote' }).click()
    }
    await hostPage.getByRole('link', { name: 'Go Vote!' }).first().click()
    await expect(hostPage).toHaveURL(`/hangouts/${id}/vote`)
    await expect(hostPage.getByText('2 spots are on the shortlist')).toBeVisible()

    // The host starts the vote and keeps 11 open
    await hostPage.getByRole('button', { name: 'Start the vote' }).click()
    await expect(hostPage.getByText('Closes in', { exact: false })).toBeVisible()
    await expect(hostPage.getByText('0 of 2 voted')).toBeVisible()

    // The friend votes for spot B
    const friendVote = friendPage.getByRole('button', {
      name: `Vote for ${SPOT_B.name}`,
      exact: true,
    })
    await friendPage.goto(`/hangouts/${id}/vote`)
    await friendVote.click()
    await expect(friendVote).toHaveText('✓ Your vote')

    // The host sees it without reloading, then closes the vote
    await expect(hostPage.getByText('1 of 2 voted')).toBeVisible({ timeout: 15000 })
    // spot B leads, so it's the winner the close card picks. The host hasn't voted, so the
    // pop-up's button says "Close anyway" instead of "Confirm"
    await hostPage.getByRole('button', { name: 'Close vote' }).click()
    await hostPage.getByRole('dialog').getByRole('button', { name: 'Close anyway' }).click()
    await expect(hostPage).toHaveURL(`/hangouts/${id}/plan`)
    await expect(hostPage.getByText('Confirmed spot')).toBeVisible()

    // The friend's plan shows the same confirmed spot
    await friendPage.goto(`/hangouts/${id}/plan`)
    await expect(friendPage.getByText('Confirmed spot')).toBeVisible()
    await expect(friendPage.getByRole('heading', { name: SPOT_B.name, exact: true })).toBeVisible()

    // And once voting is closed, the friend can't vote any more
    await friendPage.goto(`/hangouts/${id}/vote`)
    await expect(friendPage.getByText('Voting is closed.', { exact: false })).toBeVisible()
  } finally {
    await deleteHangout(hostPage, name)
    await hostContext.close()
    await friendContext.close()
  }
})
