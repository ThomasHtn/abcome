import { defineConfig, devices } from '@playwright/test';

import { SESSION_FILE } from './e2e/e2e.constants';

/**
 * Browser tests of the whole app from its images: `make up` then `npm run e2e`, or the delivery
 * workflow against the production template. Nothing is mocked, so they run against a real database.
 */
export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  // Each test writes its own word, so they never share state.
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env['E2E_BASE_URL'] ?? 'http://localhost:8000',
    // The production template serves a certificate from Caddy's own authority on localhost.
    ignoreHTTPSErrors: true,
    // The family's language, so the tests read the texts the family reads.
    locale: 'fr-FR',
    // No pulsing or entering animation: a moving button is never stable enough to be clicked.
    contextOptions: { reducedMotion: 'reduce' },
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: '**/*.setup.ts' },
    {
      name: 'mobile-chromium',
      dependencies: ['setup'],
      use: {
        ...devices['Pixel 7'],
        storageState: SESSION_FILE,
        // A fake microphone that grants itself, for the recording screen.
        permissions: ['microphone'],
        launchOptions: {
          args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
        },
      },
    },
  ],
});
