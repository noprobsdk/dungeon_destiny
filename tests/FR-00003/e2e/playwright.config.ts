// FR-00003: the Playwright end-to-end test of Content Studio. It runs both
// Workers on this machine with `wrangler dev`, as two processes connected
// through Wrangler's local dev registry, and a local stand-in for Access's key
// server. studio-web checks the test tokens exactly as it checks real Access
// tokens, against the stand-in's key instead of Cloudflare's. Chromium only.
import { defineConfig, devices } from "@playwright/test";

export const KEY_SERVER = "http://127.0.0.1:9797";
export const STUDIO_WEB = "http://127.0.0.1:8800";
export const AUDIENCE = "fr-00003-e2e-audience";
export const SUPERADMIN = "superadmin@example.invalid";

export default defineConfig({
  testDir: ".",
  testMatch: "*.e2e.ts",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: { baseURL: STUDIO_WEB },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `node tests/FR-00003/e2e/key-server.mjs 9797 ${AUDIENCE}`,
      cwd: "../../..",
      url: `${KEY_SERVER}/cdn-cgi/access/certs`,
      reuseExistingServer: false,
    },
    {
      command: `pnpm exec wrangler dev --env dev --port 8801 --inspector-port 9241 --var SUPERADMIN_EMAIL:${SUPERADMIN}`,
      cwd: "../../../apps/studio-api",
      port: 8801,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command:
        "pnpm exec vite build && pnpm exec wrangler dev --env dev --port 8800 --inspector-port 9240 " +
        `--var ACCESS_TEAM_DOMAIN:${KEY_SERVER} --var ACCESS_AUD:${AUDIENCE}`,
      cwd: "../../../apps/studio-web",
      port: 8800,
      reuseExistingServer: false,
      timeout: 90_000,
    },
  ],
});
