import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: ".",
  testMatch: /save-safety\.spec\.ts/u,
  outputDir: "../../test-results/save-safety",
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    channel: "chrome",
    headless: false,
    viewport: { width: 1440, height: 900 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});
