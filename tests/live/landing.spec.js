// Owner: Eashvar (testing). The landing page's hero cards for a real account (npm run test:live):
// once you have a hangout they're about it (the fan becomes a link to it), not "Singapore right now".
// Makes a hangout, checks the cards, deletes it. Uses E2E_EMAIL / E2E_PASSWORD (tests/live/helpers.js).
import { test, expect } from '@playwright/test'
import { createHangout, deleteHangout, host, logIn } from './helpers.js'

test('the hero cards show your own hangout once you have one', async ({ page }) => {
  await logIn(page, host)
  const { name } = await createHangout(page)
  try {
    await page.goto('/')
    // the fan is one link to your next (or last) hangout, described in words for screen readers
    const fan = page.getByRole('link', { name: /^Your (next|last) hangout, / })
    await expect(fan).toBeVisible()
    await expect(page.getByRole('img', { name: /^Right now in Singapore/ })).toHaveCount(0)
    // our new hangout has no travel times yet, so if it's the one shown, it asks for starts
    const label = await fan.getAttribute('aria-label')
    if (label.includes(name)) {
      await expect(page.getByText('Starting points', { exact: true })).toBeVisible()
    }
  } finally {
    await deleteHangout(page, name)
  }
})
