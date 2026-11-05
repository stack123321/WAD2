// Owner: Ryan
// playwright against the real supabase project (npm run test:live), needs supabase keys and E2E_EMAIL, E2E_PASSWORD in .env.local
import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'

// playwright runs in node, and node doesn't read .env.local by itself (vite only does that for the app)
process.loadEnvFile('.env.local')

export default defineConfig({
  testDir: './tests/live',
  // 60 seconds: these tests wait on the real database and OneMap, and the longest ones (making a
  // hangout, searching, saving, reloading, deleting it) can take over 30
  timeout: 60 * 1000,
  // one test at a time: they share real test accounts and the same database
  workers: 1,
  fullyParallel: false,
  reporter: 'html',
  // a stuck step fails after 20 seconds instead of using up the whole test, so each test's
  // finally block still has time to delete the hangout it made
  expect: { timeout: 20 * 1000 },
  use: {
    baseURL: 'http://localhost:5175',
    headless: true,
    actionTimeout: 20 * 1000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // its own port, so it never clashes with your dev server (5173) or the demo (5174)
  webServer: {
    command: 'npx vite --port 5175 --strictPort',
    port: 5175,
    reuseExistingServer: true,
  },
})
