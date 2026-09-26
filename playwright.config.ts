import { defineConfig, devices } from "@playwright/test";

const ci = !!process.env.CI;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: ci ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: ci ? "github" : "list",
  use: { baseURL: "http://127.0.0.1:4173", trace: "on-first-retry", acceptDownloads: true },
  webServer: {
    // `exec` so Playwright stops the preview server itself (a pnpm wrapper doesn't forward the signal), and IPv4
    // explicitly: "localhost" may resolve to ::1 for Vite but 127.0.0.1 for the readiness probe
    command: "pnpm build && exec node_modules/.bin/vite preview --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !ci,
    timeout: 120_000,
  },
  projects: [
    // locally reuse the installed Google Chrome; CI installs Playwright's Chromium
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        ...(ci ? {} : { channel: "chrome" }),
      },
    },
    // WebKit is what the macOS and Linux desktop builds render with
    { name: "webkit", use: { ...devices["Desktop Safari"], viewport: { width: 1440, height: 900 } } },
  ],
});
