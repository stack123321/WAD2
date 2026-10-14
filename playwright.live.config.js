// Owner: Ryan. Playwright tests against the real Supabase project (tests/live).
// Run with: npm run test:live. Needs the Supabase keys plus E2E_EMAIL and E2E_PASSWORD in .env.local.
import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'

// Playwright runs in Node, and Node doesn't read .env.local by itself (Vite only does that for the app)
process.loadEnvFile('.env.local')

export default defineConfig({
  testDir: './tests/live',
  timeout: 30 * 1000,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5175',
    headless: true,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Its own port, so it never clashes with your dev server (5173) or the demo (5174)
  webServer: {
    command: 'npx vite --port 5175 --strictPort',
    port: 5175,
    reuseExistingServer: true,
  },
})
