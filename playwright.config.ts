import { defineConfig, devices } from '@playwright/test';
import os from 'os';

const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const workers = isCI ? 2 : Math.max(1, Math.floor(os.cpus().length / 2));

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'local-tests',
      testMatch: /^(?!.*-live\.test\.ts$).*\.test\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'live-tests',
      testMatch: /.*-live\.test\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
