// Owner: Surya
// Past hangouts: "Go again" (same group, place and starting points, only a new date)
// Uses the sample data (no Supabase keys). The sample hangout hasn't been decided, so some tests
// serve a copy of it that's done, with Mock Cafe chosen.
import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

const sample = JSON.parse(readFileSync(new URL('../../src/mocks/hangout.json', import.meta.url)))

// The sample hangout as if it was decided and done
async function useDecidedSample(page) {
  const decided = { ...sample, status: 'done', final_shortlist_id: 'demo-spot-1' }
  await page.route('**/src/mocks/hangout.json*', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `export default ${JSON.stringify(decided)}`,
    }),
  )
}

test.beforeEach(async ({ page }) => {
  // the sample hangout is on 16 Oct, so it's in the past
  await page.clock.setFixedTime(new Date('2026-10-30T12:00:00+08:00'))
})

test('a decided past hangout has Go again on its card', async ({ page }) => {
  await useDecidedSample(page)
  await page.goto('/dashboard')
  await page.getByRole('button', { name: 'Past' }).click()
  await expect(page.getByRole('link', { name: '↻ Go again' })).toBeVisible()
})

test('Go again opens New hangout with the place, the group and the name filled in', async ({
  page,
}) => {
  await useDecidedSample(page)
  await page.goto('/dashboard')
  await page.getByRole('button', { name: 'Past' }).click()
  await page.getByRole('link', { name: '↻ Go again' }).click()
  await expect(page.getByText('↻ Going again to Mock Cafe (sample data)')).toBeVisible()
  await expect(page.getByLabel(/Hangout name/)).toHaveValue('Friday dinner after class (again)')
})

test('Debrief offers Go again to the place you went', async ({ page }) => {
  await useDecidedSample(page)
  await page.goto('/hangouts/demo/debrief')
  await expect(
    page.getByRole('link', { name: '↻ Go again to Mock Cafe (sample data)' }),
  ).toBeVisible()
})

test('a hangout that was never decided has no Go again', async ({ page }) => {
  await page.goto('/hangouts/demo/debrief')
  await expect(page.getByRole('link', { name: /Go again/ })).toHaveCount(0)
  await page.goto('/hangouts/new?again=demo')
  await expect(page.getByText('That hangout was never decided')).toBeVisible()
})

// Photos (the sample hangout has no database, so it explains instead of uploading)
test('Debrief has a Photos panel that says photos work in real hangouts', async ({ page }) => {
  await useDecidedSample(page)
  await page.goto('/hangouts/demo/debrief')
  await expect(page.getByRole('heading', { name: 'Photos' })).toBeVisible()
  await expect(page.getByText('Photos work in real hangouts.')).toBeVisible()
  await expect(page.getByRole('button', { name: '+ Add photos' })).toHaveCount(0)
})
