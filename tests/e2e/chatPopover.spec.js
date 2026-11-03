// Owner: Ryan. E2E tests for the group chat on top of the page (ChatPopover): 💬 in the step bar
// opens it without leaving the step, ✕, Esc and the button close it, and on a phone it fills the
// screen. The sample hangout has no chat messages, so these check the panel, not the messages.
import { test, expect } from '@playwright/test'

test('on a laptop the chat opens on top of the step and closes again', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/hangouts/demo/vote')
  const chat = page.getByRole('dialog', { name: 'Group chat' })

  await page.getByRole('button', { name: 'Open group chat' }).click()
  await expect(chat).toBeVisible()
  await expect(page).toHaveURL('/hangouts/demo/vote') // still on the step
  await expect(page.getByRole('button', { name: 'Close group chat' })).toHaveText(/Close chat/)

  await page.keyboard.press('Escape')
  await expect(chat).toBeHidden()

  await page.getByRole('button', { name: 'Open group chat' }).click()
  await chat.getByRole('button', { name: 'Close chat' }).click()
  await expect(chat).toBeHidden()

  await page.getByRole('button', { name: 'Open group chat' }).click()
  await page.getByRole('button', { name: 'Close group chat' }).click()
  await expect(chat).toBeHidden()
})

test('on a phone the chat fills the screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/hangouts/demo/vote')

  await page.getByRole('button', { name: 'Open group chat' }).click()

  const box = await page.getByRole('dialog', { name: 'Group chat' }).boundingBox()
  expect(box.width).toBe(390)
  expect(box.height).toBe(844)
})
