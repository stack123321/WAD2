// Owner: Eashvar (testing). Vitest settings for the unit tests (plain functions, Week 10a) and the
// component and integration tests (Vue components, Week 10b). They sit in __tests__ folders next
// to the code they test (src, and api for the serverless helpers). The E2E tests in tests/e2e are
// run by Playwright, not Vitest.
// Run them with: npm run test:unit
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom', // a pretend browser page, so components can be mounted
    include: ['src/**/__tests__/*.spec.js', 'api/**/__tests__/*.spec.js'],
  },
})
