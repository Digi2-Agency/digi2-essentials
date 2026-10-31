// Browser gate before a release (`npm run release:check`). Loads dist/ — the
// exact files jsDelivr will serve after the tag — on sandbox/gate-*.html.
// Kept small on purpose: one headless Chromium, two workers, < 2 minutes.
const { defineConfig } = require('@playwright/test');

const PORT = 5179;

module.exports = defineConfig({
  testDir: 'tests/browser',
  timeout: 20000,
  expect: {
    timeout: 4000,
    // Same machine, same Chromium: renders are pixel-identical run to run. An
    // absolute budget, not a ratio — a recoloured error line is < 1% of the
    // frame and must still fail.
    toHaveScreenshot: { maxDiffPixels: 30, animations: 'disabled', caret: 'hide' },
  },
  fullyParallel: true,
  workers: 2,
  retries: 0,
  forbidOnly: true,
  reporter: [['list']],
  // Baselines are per OS (…-linux.png); regenerate with
  // `npm run test:browser -- --update-snapshots` after a deliberate visual change.
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}-{platform}{ext}',
  outputDir: 'tests/browser/.results',
  use: {
    baseURL: 'http://127.0.0.1:' + PORT,
    browserName: 'chromium',
    headless: true,
    viewport: { width: 800, height: 640 },
    locale: 'pl-PL',
    timezoneId: 'Europe/Warsaw',
    // A module that throws on load freezes the page (loader proxy replays the
    // call forever), so `load` never fires: fail in seconds, not the test timeout.
    navigationTimeout: 5000,
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node tests/browser/serve.js ' + PORT,
    url: 'http://127.0.0.1:' + PORT + '/sandbox/gate-forms.html',
    reuseExistingServer: false,
    timeout: 10000,
  },
});
