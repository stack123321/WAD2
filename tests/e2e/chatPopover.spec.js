// Owner: Ryan (tests: Eashvar). E2E tests (Week 10c) for the group chat on top of the page
// (ChatPopover): 💬 in the step bar opens it without leaving the step, and ✕, Esc and the button
// close it, on a laptop and on a phone (helpers/phone.js). The sample hangout has no chat
// messages, so these check the panel, not the messages.
import { test, expect } from '@playwright/test'
import { onPhone } from './helpers/phone.js'

test('on a laptop the chat opens on top of the step and closes again', async ({ page }) => {
  await page.goto('/hangouts/demo/vote')
  const chat = page.getByRole('dialog', { name: 'Group chat' })

  await page.getByRole('button', { name: 'Open group chat' }).click()
  await expect(chat).toBeVisible()
  await expect(page).toHaveURL('/hangouts/demo/vote') // still on the step
  await expect(page.getByRole('button', { name: 'Close group chat' })).toHaveText(/Close chat/)

  // Esc closes it, like other pop-ups (page.keyboard isn't in the course; it's the only way to press Esc)
  await page.keyboard.press('Escape')
  await expect(chat).toBeHidden()

  await page.getByRole('button', { name: 'Open group chat' }).click()
  await chat.getByRole('button', { name: 'Close chat' }).click()
  await expect(chat).toBeHidden()

  await page.getByRole('button', { name: 'Open group chat' }).click()
  await page.getByRole('button', { name: 'Close group chat' }).click()
  await expect(chat).toBeHidden()
})

test('on a phone the chat opens over the step and closes again', async ({ page }) => {
  await onPhone(page)
  await page.goto('/hangouts/demo/vote')
  const chat = page.getByRole('dialog', { name: 'Group chat' })

  await page.getByRole('button', { name: 'Open group chat' }).click()
  await expect(chat).toBeVisible()
  await expect(page).toHaveURL('/hangouts/demo/vote')

  await chat.getByRole('button', { name: 'Close chat' }).click()
  await expect(chat).toBeHidden()
})
