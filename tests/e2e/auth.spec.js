// Owner: Eashvar (testing). E2E tests (Week 10c) for 02 Log in / Sign up: the form says what's
// missing or wrong before it sends anything, and logging in opens My hangouts. Without Supabase
// keys any email and password logs in, so this checks the page, not real accounts (tests/live
// does that).
import { test, expect } from '@playwright/test'

test('logging in with nothing filled in says what is missing', async ({ page }) => {
  await page.goto('/login')

  await page.getByRole('button', { name: 'Log in', exact: true }).click()

  await expect(page.getByText('Enter your email.')).toBeVisible()
  await expect(page.getByText('Enter your password.')).toBeVisible()
  await expect(page).toHaveURL('/login')
})

test('sign up asks for a name and a long enough password', async ({ page }) => {
  await page.goto('/login?mode=signup')
  await page.getByLabel('Email').fill('new.person@example.test')
  await page.getByLabel('Password', { exact: true }).fill('abc')

  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page.getByText('Enter your name.')).toBeVisible()
  await expect(page.getByText('Use at least 8 characters (3 so far).')).toBeVisible()
})

test('logging in opens My hangouts', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('ryan@example.test')
  await page.getByLabel('Password', { exact: true }).fill('testpass123')

  await page.getByRole('button', { name: 'Log in', exact: true }).click()

  await expect(page).toHaveURL('/dashboard')
})
