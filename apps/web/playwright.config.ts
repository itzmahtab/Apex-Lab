import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against the offline demo data (DATA_SOURCE=fixture),
 * so CI never depends on OpenF1 availability or rate limits.
 */
const PORT = 3200;
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "off" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    port: PORT,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    env: { DATA_SOURCE: "fixture" },
  },
});
