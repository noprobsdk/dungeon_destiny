// FR-00003, FR-00004: the Playwright end-to-end tests of Content Studio. They
// run both Workers on this machine with `wrangler dev`, as two processes
// connected through Wrangler's local dev registry, with a local stand-in for
// Access's key server. studio-web checks the test tokens exactly as it checks
// real Access tokens, against the stand-in's key instead of Cloudflare's.
// FR-00004: studio-api gets a fresh local Content D1 with every migration
// applied, and a local stand-in for Cloudflare's API with a fake token
// (DD-021). Chromium only.
import { defineConfig, devices } from "@playwright/test";

export const KEY_SERVER = "http://127.0.0.1:9797";
export const CLOUDFLARE_API = "http://127.0.0.1:9798";
export const STUDIO_WEB = "http://127.0.0.1:8800";
export const AUDIENCE = "fr-00003-e2e-audience";
export const SUPERADMIN = "superadmin@example.invalid";
const ACCOUNT = "e2e-account";
const GROUP = "e2e-group";
const TOKEN = "e2e-fake-access-group-token";
const D1_STATE = ".wrangler/e2e-content-d1";
// Both Workers use their own dev registry, emptied before every run.
const REGISTRY = { WRANGLER_REGISTRY_PATH: "../../apps/studio-api/.wrangler/e2e-registry" };

export default defineConfig({
  testDir: "../..",
  testMatch: ["FR-00003/e2e/*.e2e.ts", "FR-00004/e2e/*.e2e.ts"],
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
      command: `node tests/FR-00004/e2e/cloudflare-api.mjs 9798 ${ACCOUNT} ${GROUP} ${TOKEN} ${SUPERADMIN}`,
      cwd: "../../..",
      url: `${CLOUDFLARE_API}/members`,
      reuseExistingServer: false,
    },
    {
      command:
        "node ../../tests/FR-00004/e2e/fresh-d1.mjs && " +
        `pnpm exec wrangler d1 migrations apply dd-dev-content --local --env dev --persist-to ${D1_STATE} && ` +
        `pnpm exec wrangler dev --env dev --port 8801 --inspector-port 9241 --persist-to ${D1_STATE} ` +
        `--var SUPERADMIN_EMAIL:${SUPERADMIN} --var CF_ACCOUNT_ID:${ACCOUNT} --var ACCESS_GROUP_ID:${GROUP} ` +
        `--var CF_API_BASE:${CLOUDFLARE_API}/client/v4 --var CF_ACCESS_GROUP_TOKEN:${TOKEN}`,
      cwd: "../../../apps/studio-api",
      env: REGISTRY,
      port: 8801,
      reuseExistingServer: false,
      timeout: 90_000,
    },
    {
      command:
        "node ../../tests/FR-00004/e2e/wait-for.mjs http://127.0.0.1:8801 && " +
        "pnpm exec vite build && pnpm exec wrangler dev --env dev --port 8800 --inspector-port 9240 " +
        `--var ACCESS_TEAM_DOMAIN:${KEY_SERVER} --var ACCESS_AUD:${AUDIENCE}`,
      cwd: "../../../apps/studio-web",
      env: REGISTRY,
      port: 8800,
      reuseExistingServer: false,
      timeout: 90_000,
    },
  ],
});
