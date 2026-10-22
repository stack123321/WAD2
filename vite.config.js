import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import devApi from './scripts/dev-api.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    ...(process.env.DEVTOOLS ? [vueDevTools()] : []), // the floating devtools button, only when DEVTOOLS=1
    devApi(), // runs api/*.js during `npm run dev`
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
