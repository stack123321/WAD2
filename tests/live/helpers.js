// Owner: Eashvar (testing). Shared steps for the live tests, which use the real Supabase project
// and real test accounts from .env.local:
//   E2E_EMAIL / E2E_PASSWORD        the first test account (the host)
//   E2E_EMAIL_2 / E2E_PASSWORD_2    a second test account (a friend), for tests with two people
// Every hangout a test makes is named "E2E test …" and deleted at the end, so the shared
// database doesn't fill up with test data. Fields are found by their label and buttons by their
// name, as in the course (Week 10c).
import process from 'node:process'
import { expect } from '@playwright/test'

export const host = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }
export const friend = { email: process.env.E2E_EMAIL_2, password: process.env.E2E_PASSWORD_2 }
export const hasFriend = Boolean(friend.email && friend.password)

/** Logs in through 02 and waits until the page it was sent to (default My hangouts) opens. */
export async function logIn(page, account, redirect = '/dashboard') {
  await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`)
  await page.getByLabel('Email').fill(account.email)
  await page.getByLabel('Password', { exact: true }).fill(account.password)
  // the second "Log in" button is the form's (the first switches the form to Log in)
  await page.getByRole('button', { name: 'Log in', exact: true }).last().click()
  await expect(page).toHaveURL(redirect)
}

/** Makes a hangout through 05 and returns its name and id (from the 06 address it opens). */
export async function createHangout(page) {
  const name = `E2E test ${Date.now()}`
  await page.goto('/hangouts/new')
  await page.getByLabel(/Hangout name/).fill(name)
  await page.getByLabel('Date').fill('2030-01-15')
  await page.getByLabel('Time').fill('19:00')
  await page.getByRole('button', { name: 'Create & add starting points' }).click()
  await expect(page).toHaveURL(/\/hangouts\/[^/]+\/start$/)
  const id = new URL(page.url()).pathname.split('/')[2]
  return { name, id }
}

/** Deletes a hangout through its ⋯ menu on My hangouts (the host only). */
export async function deleteHangout(page, name) {
  await page.goto('/dashboard')
  const menuButton = page.getByRole('button', { name: `More options for ${name}` })
  await menuButton.click()
  await page.getByRole('button', { name: 'Delete hangout' }).click()
  // then the same button again in the "Are you sure?" dialog
  await page.getByRole('dialog').getByRole('button', { name: 'Delete hangout' }).click()
  await expect(menuButton).toBeHidden()
}

/**
 * The hangout's invite link, from "Copy invite link" in its ⋯ menu on My hangouts. The app never
 * shows the link on screen, only copies it, so this reads it back from the clipboard
 * (grantPermissions and page.evaluate aren't covered in the course).
 */
export async function copyInviteLink(page, context, name) {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/dashboard')
  await page.getByRole('button', { name: `More options for ${name}` }).click()
  await page.getByRole('button', { name: 'Copy invite link' }).click()
  const link = await page.evaluate(() => navigator.clipboard.readText())
  expect(link).toContain('/login?invite=')
  return new URL(link).pathname + new URL(link).search
}

/**
 * Fake Google Places answers, so spots can go on a real shortlist without calling Google.
 * page.route isn't covered in the course (same as tests/e2e/helpers/places.js).
 */
export async function stubSpots(page, spots) {
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
