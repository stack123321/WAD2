// Owner: Eashvar (testing). The group chat against the real Supabase project (npm run test:live).
// Sample hangouts have no database, so their chat only explains that it works in real hangouts;
// sending a message can only be tested here. The hangout is deleted at the end.
import { test, expect } from '@playwright/test'
import { createHangout, deleteHangout, host, logIn } from './helpers.js'

test('a message sent in the hangout chat shows, and is still there after a reload', async ({
  page,
}) => {
  await logIn(page, host)
  const { name, id } = await createHangout(page)
  const message = `Hello from the E2E test ${Date.now()}`

  await page.goto(`/chats/${id}`)
  await page.getByLabel('Message', { exact: true }).fill(message)
  await page.getByRole('button', { name: 'Send', exact: true }).click()

  await expect(page.getByText(message)).toBeVisible()
  await page.reload()
  await expect(page.getByText(message)).toBeVisible()

  await deleteHangout(page, name)
})
