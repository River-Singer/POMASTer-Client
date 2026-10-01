import { defineConfig } from '@playwright/test'

/**
 * E2E smoke for the POMaster Workbench panel inside the running DSH web
 * profile (judgment anchor: the official @playwright/test report).
 * Uses the system Chrome via channel — no browser download (GFW-safe).
 * DSH_TOKEN env supplies the boot token of the running profile.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  reporter: [['json', { outputFile: '../.spike/playwright-report.json' }]],
  use: {
    channel: 'chrome',
    headless: true,
    baseURL: 'http://127.0.0.1:3080',
  },
})
