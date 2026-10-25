import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
import baseline from "../../playwright.config";

export default defineConfig({
  ...baseline,
  testDir: ".",
  globalSetup: fileURLToPath(new URL("./feature009-global-setup.ts", import.meta.url)),
  testMatch: /editor-quality\.spec\.ts/u,
  outputDir: "../../test-results/editor-quality",
  webServer: [],
  projects: [
    { name: "chrome", use: { channel: "chrome", viewport: { width: 1440, height: 900 } } },
  ],
  use: { ...baseline.use, baseURL: "http://127.0.0.1:4173" },
});
