// Owner: Ryan
// playwright against the real supabase project (npm run test:live), needs supabase keys and E2E_EMAIL, E2E_PASSWORD in .env.local
import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'

// playwright runs in node, and node doesn't read .env.local by itself (vite only does that for the app)
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
  // its own port, so it never clashes with your dev server (5173) or the demo (5174)
  webServer: {
    command: 'npx vite --port 5175 --strictPort',
    port: 5175,
    reuseExistingServer: true,
  },
})
