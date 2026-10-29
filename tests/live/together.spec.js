// Owner: Eashvar (testing). Two real people in one hangout, against the real Supabase project
// (npm run test:live), each in their own browser: someone who isn't in the hangout can't add a
// starting point or vote; the invite link adds them; the host sees them appear without
// reloading; and a whole vote (spots added, vote started, the friend votes, the host sees it live
// and closes it) reaches the final plan for both. Needs E2E_EMAIL_2 / E2E_PASSWORD_2 too
// (tests/live/helpers.js); skipped without them. The hangout is deleted at the end.
import { test, expect } from '@playwright/test'
import {
  copyInviteLink,
  createHangout,
  deleteHangout,
  friend,
  hasFriend,
  host,
  logIn,
  spot,
  stubSpots,
} from './helpers.js'

test.skip(!hasFriend, 'Add E2E_EMAIL_2 and E2E_PASSWORD_2 (a second test account) to .env.local')
test.describe.configure({ mode: 'serial', timeout: 120000 })

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
    // Before joining, the friend can't add a starting point or vote (database rules)
    await friendPage.goto(`/hangouts/${id}/start`)
    await expect(
      friendPage.getByText(
        "You're not a member of this hangout, so you can't add a starting point.",
      ),
    ).toBeVisible()
    await friendPage.goto(`/hangouts/${id}/vote`)
    await expect(
      friendPage.getByText("You're not in this hangout, so you can't vote.", { exact: false }),
    ).toBeVisible()

    // The host keeps 06 open; the friend joins with the invite link
    const invite = await copyInviteLink(hostPage, hostContext, name)
    await hostPage.goto(`/hangouts/${id}/start`)
    // the group list is the list with the host's own "(you)" row
    const groupRows = hostPage.locator('ul').filter({ hasText: '(you)' }).getByRole('listitem')
    const before = await groupRows.count()

    await friendPage.goto(invite)
    await expect(friendPage).toHaveURL(`/hangouts/${id}/start`)

    // The host sees one more person without reloading (live updates)
    await expect(groupRows).toHaveCount(before + 1, { timeout: 15000 })

    // The host puts two spots on the shortlist from 10 Spot details (Google is faked)
    await stubSpots(hostPage, [SPOT_A, SPOT_B])
    for (const s of [SPOT_A, SPOT_B]) {
      await hostPage.goto(`/hangouts/${id}/spots/${s.source_place_id}`)
      await hostPage.getByRole('button', { name: 'Add to Vote' }).click()
      await expect(hostPage.getByRole('button', { name: 'Remove from Vote' })).toBeVisible()
    }

    // The host starts the vote and keeps 11 open
    await hostPage.goto(`/hangouts/${id}/vote`)
    await hostPage.getByRole('button', { name: 'Start the vote' }).click()
    await expect(hostPage.getByText('Closes in')).toBeVisible()
    const tally = hostPage.getByRole('progressbar', { name: SPOT_B.name, exact: true })
    await expect(tally).toHaveAttribute('aria-valuenow', '0')

    // The friend votes for spot B
    await friendPage.goto(`/hangouts/${id}/vote`)
    await friendPage.getByRole('button', { name: `Vote for ${SPOT_B.name}`, exact: true }).click()
    await expect(
      friendPage.getByRole('progressbar', { name: SPOT_B.name, exact: true }),
    ).toHaveAttribute('aria-valuenow', '1')

    // The host sees it without reloading, then closes the vote
    await expect(tally).toHaveAttribute('aria-valuenow', '1', { timeout: 15000 })
    // spot B leads, so it's the winner the close card picks
    await hostPage.getByRole('button', { name: 'Close vote' }).click()
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
