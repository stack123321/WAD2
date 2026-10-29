// Owner: Eashvar (testing). Shared steps for the live tests, which use the real Supabase project
// and real test accounts from .env.local:
//   E2E_EMAIL / E2E_PASSWORD        the first test account (the host)
//   E2E_EMAIL_2 / E2E_PASSWORD_2    a second test account (a friend), for tests with two people
// Every hangout a test makes is named "E2E test …" and deleted at the end, so the shared
// database doesn't fill up with test data.
import process from 'node:process'
import { expect } from '@playwright/test'

export const host = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }
export const friend = { email: process.env.E2E_EMAIL_2, password: process.env.E2E_PASSWORD_2 }
export const hasFriend = Boolean(friend.email && friend.password)

/** Logs in through 02 and waits until the page it was sent to (default My hangouts) opens. */
export async function logIn(page, account, redirect = '/dashboard') {
  await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`)
  await page.locator('#auth-email').fill(account.email)
  await page.locator('#auth-password').fill(account.password)
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL(redirect)
}

/** Makes a hangout through 05 and returns its name and id (from the 06 address it opens). */
export async function createHangout(page) {
  const name = `E2E test ${Date.now()}`
  await page.goto('/hangouts/new')
  await page.locator('#hangout-name').fill(name)
  await page.locator('#hangout-date').fill('2030-01-15')
  await page.locator('#hangout-time').fill('19:00')
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL(/\/hangouts\/[^/]+\/start$/)
  const id = new URL(page.url()).pathname.split('/')[2]
  return { name, id }
}

/** Deletes a hangout through its ⋯ menu on My hangouts (the host only). */
export async function deleteHangout(page, name) {
  await page.goto('/dashboard')
  const menuButton = page.locator(`button[aria-label="More options for ${name}"]`)
  await menuButton.click()
  await page.locator('.dropdown-menu.show').getByRole('button', { name: 'Delete hangout' }).click()
  await page.locator('#confirm-modal').getByRole('button', { name: 'Delete hangout' }).click()
  await expect(menuButton).toHaveCount(0)
}

/** The hangout's invite link, from "Copy invite link" in its ⋯ menu on My hangouts. */
export async function copyInviteLink(page, context, name) {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/dashboard')
  await page.locator(`button[aria-label="More options for ${name}"]`).click()
  await page
    .locator('.dropdown-menu.show')
    .getByRole('button', { name: 'Copy invite link' })
    .click()
  const link = await page.evaluate(() => navigator.clipboard.readText())
  expect(link).toContain('/login?invite=')
  return new URL(link).pathname + new URL(link).search
}

/** Fake Google Places answers, so spots can go on a real shortlist without calling Google. */
export async function stubSpots(page, spots) {
  await page.addInitScript(() =>
    window.localStorage.setItem('fairpoint.googlePlacesEnabled', 'true'),
  )
  await page.route('**/api/places**', (route) => {
    const url = new URL(route.request().url())
    if (url.searchParams.get('summary')) return route.fulfill({ json: null })
    const id = url.searchParams.get('id')
    return route.fulfill({ json: id ? spots.find((s) => s.source_place_id === id) : spots })
  })
}

export function spot(id, name) {
  return {
    source: 'google',
    source_place_id: id,
    name,
    category: 'cafe',
    types: ['cafe'],
    lat: 1.3508,
    lng: 103.8485,
    rating: 4.3,
    review_count: 10,
    price_level: 1,
    image_url: null,
    distance_m: 200,
    address: 'Bishan, Singapore',
    google_maps_uri: null,
    open_now: null,
    opening_hours: null,
    wheelchair_accessible: null,
    description: null,
    tags: [],
    nearest_station_name: 'Bishan',
    station_distance_m: 200,
  }
}
