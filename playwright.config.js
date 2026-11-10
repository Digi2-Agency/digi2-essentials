// Browser gate before a release (`npm run release:check`). Loads dist/ — the
// exact files jsDelivr will serve after the tag — on sandbox/gate-*.html.
// Kept small on purpose: one headless Chromium, two workers, < 2 minutes.
const { defineConfig } = require('@playwright/test');

const { execFileSync } = require('child_process');

// The gate's own server port. 5179 is the habit, but this machine runs several
// teams, and a gate (or a server left behind) on 5179 made ours fail with
// "already used" before any test ran. So: 5179 when it is free, otherwise any
// free port the OS gives. Chosen once in the runner and handed to the workers
// through the environment (each worker loads this file again). Kept
// synchronous because Playwright reads the config synchronously.
function pickPort() {
  if (process.env.D2_GATE_PORT) return Number(process.env.D2_GATE_PORT);
  const probe = "const s=require('net').createServer();"
    + "s.once('error',()=>{const t=require('net').createServer();t.listen(0,'127.0.0.1',()=>{process.stdout.write(String(t.address().port));t.close();});});"
    + "s.listen(Number(process.argv[1]),'127.0.0.1',()=>{process.stdout.write(process.argv[1]);s.close();});";
  const port = Number(execFileSync(process.execPath, ['-e', probe, '5179'], { encoding: 'utf8' }));
  process.env.D2_GATE_PORT = String(port);
  return port;
}
const PORT = pickPort();

module.exports = defineConfig({
  testDir: 'tests/browser',
  timeout: 30000,
  // The gate promises < 2 minutes; a run that takes longer is itself red.
  globalTimeout: 120000,
  expect: {
    // Generous for a loaded machine (a 4 s budget flaked once at load avg 70);
    // a broken module still fails well inside globalTimeout.
    timeout: 10000,
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
    // A page that never fires `load` (before v1.8.3 a module throwing on load
    // froze the tab) fails after 15 s per navigation instead of the 30 s test
    // timeout.
    navigationTimeout: 15000,
    // Nothing leaves this machine, at the browser level (the spec also aborts
    // and reports every non-local request through context.route):
    //  - no service workers, so nothing can fetch around the route handler;
    //  - every host resolves to "not found" except 127.0.0.1 / localhost —
    //    covers WebSockets, sendBeacon and new windows too. Chromium applies
    //    MAP * to IP literals as well, hence the explicit EXCLUDE 127.0.0.1.
    serviceWorkers: 'block',
    launchOptions: {
      args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost'],
    },
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
