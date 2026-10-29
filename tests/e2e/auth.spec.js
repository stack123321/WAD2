// Owner: Eashvar (testing). 02 Log in / Sign up: the form says what's missing or wrong before it
// sends anything, sign up asks for a name and an 8-character password, logging in opens My
// hangouts (or the page you were sent from with ?redirect=), and "Forgot password?" confirms it
// sent a link. Without Supabase keys any email and password logs in, so this checks the page,
// not real accounts (tests/live does that).
import { test, expect } from '@playwright/test'

const email = (page) => page.getByLabel('Email')
const password = (page) => page.getByLabel('Password', { exact: true })
const logInButton = (page) => page.getByRole('button', { name: 'Log in', exact: true })

test('logging in with nothing filled in says what is missing', async ({ page }) => {
  await page.goto('/login')
  await logInButton(page).click()

  await expect(page.getByText('Enter your email.')).toBeVisible()
  await expect(page.getByText('Enter your password.')).toBeVisible()
  await expect(page).toHaveURL('/login')
  await expect(email(page)).toBeFocused()
})

test('an email that isn’t an email is caught', async ({ page }) => {
  await page.goto('/login')
  await email(page).fill('not-an-email')
  await password(page).fill('whatever1')
  await logInButton(page).click()

  await expect(page.getByText('Enter a valid email, like name@example.com.')).toBeVisible()
  await expect(page).toHaveURL('/login')
})

test('sign up asks for a name and a long enough password', async ({ page }) => {
  await page.goto('/login?mode=signup')
  await email(page).fill('new.person@example.test')
  await password(page).fill('abc')
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page.getByText('Enter your name.')).toBeVisible()
  await expect(page.getByText('Use at least 8 characters (3 so far).')).toBeVisible()
  await expect(page).toHaveURL(/mode=signup/)
})

test('switching between Log in and Sign up changes the form', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByLabel('Name')).toHaveCount(0)

  await page.getByRole('button', { name: 'Create an account' }).click()
  await expect(page.getByLabel('Name')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible()

  await page.getByRole('button', { name: 'Log in', exact: true }).first().click()
  await expect(page.getByLabel('Name')).toHaveCount(0)
})

test('logging in opens My hangouts', async ({ page }) => {
  await page.goto('/login')
  await email(page).fill('ryan@example.test')
  await password(page).fill('testpass123')
  await logInButton(page).click()

  await expect(page).toHaveURL('/dashboard')
})

test('logging in goes back to the page you were sent from', async ({ page }) => {
  await page.goto('/login?redirect=/friends')
  await email(page).fill('ryan@example.test')
  await password(page).fill('testpass123')
  await logInButton(page).click()

  await expect(page).toHaveURL('/friends')
})

test('Forgot password? needs an email, then confirms a link is on its way', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Forgot password?' }).click()
  await expect(page.getByText('Enter your email.')).toBeVisible()

  await email(page).fill('ryan@example.test')
  await page.getByRole('button', { name: 'Forgot password?' }).click()
  await expect(
    page.getByText('If ryan@example.test has an account, a reset link is on its way.'),
  ).toBeVisible()
})
