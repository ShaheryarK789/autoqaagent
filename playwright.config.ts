import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';
import { loadSiteEnv } from './bin/site-env.mjs';

// Load .env.<site> and .env so TARGET_URL and the test account also reach runs
// started without the autoqa runner (npx playwright test, UI mode). The site
// comes from AUTOQA_SITE or the site/<name> branch.
loadSiteEnv({ root: import.meta.dirname });

const baseURL = process.env.TARGET_URL;

// Sites with a login: generated-tests/auth.setup.ts signs in once with the test
// account and saves the session to .auth/user.json. Specs that need to be signed
// in opt in with test.use({ storageState: AUTH_FILE }) from the fixtures.
const hasAuthSetup = existsSync('generated-tests/auth.setup.ts');
const dependencies = hasAuthSetup ? ['setup'] : [];

export default defineConfig({
  testDir: './generated-tests/specs',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  // WORKERS in the site's settings caps parallel browsers, for shared public
  // apps that throttle bursts of traffic. Left unset, Playwright decides.
  workers: process.env.WORKERS ? Number(process.env.WORKERS) : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    ...(hasAuthSetup ? [{ name: 'setup', testDir: './generated-tests', testMatch: /auth\.setup\.ts/ }] : []),
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, grepInvert: /@mobile/, dependencies },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/, dependencies },
  ],
});
