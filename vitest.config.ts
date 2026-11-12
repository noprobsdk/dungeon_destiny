// Runs every Feature Request's tests with `pnpm test`, as one Vitest project
// per Worker plus one for Content Studio's pages.
//
// FR-00001: the gateway Worker's tests run in the Workers runtime with its
// Wrangler configuration and dev environment.
// FR-00005: the gateway's version-check tests also run with raised and with
// invalid thresholds, each in its own project.
// FR-00003: the studio-api and studio-web Workers' tests run the same way, each
// with its own configuration; studio-api gets a test SuperAdmin email address.
// FR-00004: studio-api's tests also get a local Content D1 with every
// migration applied, and test values for the Access group sync.
// Content Studio's React pages run in jsdom.
// FR-00006: the player Worker's tests run with a local Player D1 with every
// migration applied. The gateway's Player Identity tests run in their own
// project with a local Player D1 for the real Account operations, called in
// place of the PLAYER binding. Every gateway project gets a stand-in
// dd-dev-player service, because the PLAYER binding needs one to start.
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// FR-00004: Content D1's migrations, applied to an empty local database before
// every studio-api test.
const contentMigrations = await readD1Migrations("./apps/studio-api/migrations");

// FR-00006: Player D1's migrations, applied to an empty local database before
// every player test.
const playerMigrations = await readD1Migrations("./apps/player/migrations");

// FR-00004: the first request in a Workers-runtime project starts the Worker,
// which can take longer than Vitest's 5-second default when the repository is
// on a Windows drive under WSL. The tests themselves stay fast.
const WORKER_TEST_TIMEOUT = 30_000;

// FR-00006: the PLAYER service binding of the gateway needs a service of that
// name to start the runtime. The Player Identity tests pass their own PLAYER.
const playerStandIn = {
  name: "dd-dev-player",
  modules: true,
  compatibilityDate: "2026-10-07",
  script: "export default { fetch() { return new Response(null, { status: 404 }); } };",
};

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [
          cloudflareTest({
            wrangler: { configPath: "./apps/gateway/wrangler.jsonc", environment: "dev" },
            miniflare: { workers: [playerStandIn] },
          }),
        ],
        test: {
          name: "gateway",
          include: ["tests/FR-00001/**/*.test.ts", "tests/FR-00005/*.test.ts"],
          testTimeout: WORKER_TEST_TIMEOUT,
        },
      },
      {
        // FR-00005: the gateway with raised Android thresholds (test values
        // only), to check builds below the recommended and minimum builds.
        plugins: [
          cloudflareTest({
            wrangler: { configPath: "./apps/gateway/wrangler.jsonc", environment: "dev" },
            miniflare: { bindings: { APP_MIN_BUILD_ANDROID: "2", APP_RECOMMENDED_BUILD_ANDROID: "3" }, workers: [playerStandIn] },
          }),
        ],
        test: { name: "gateway-thresholds", include: ["tests/FR-00005/thresholds/**/*.test.ts"], testTimeout: WORKER_TEST_TIMEOUT },
      },
      {
        // FR-00005: the gateway with invalid thresholds (minimum above
        // recommended), which it must refuse rather than guess.
        plugins: [
          cloudflareTest({
            wrangler: { configPath: "./apps/gateway/wrangler.jsonc", environment: "dev" },
            miniflare: { bindings: { APP_MIN_BUILD_ANDROID: "4", APP_RECOMMENDED_BUILD_ANDROID: "3" }, workers: [playerStandIn] },
          }),
        ],
        test: {
          name: "gateway-misconfigured",
          include: ["tests/FR-00005/misconfigured/**/*.test.ts"],
          testTimeout: WORKER_TEST_TIMEOUT,
        },
      },
      {
        // FR-00006: Player Identity in the gateway, with a local Player D1 for
        // the real Account operations. The tests generate the signing key and
        // pass it with the other secrets in a test environment (DD-021).
        plugins: [
          cloudflareTest({
            wrangler: { configPath: "./apps/gateway/wrangler.jsonc", environment: "dev" },
            miniflare: {
              workers: [playerStandIn],
              d1Databases: ["TEST_PLAYER_D1"],
              bindings: { TEST_PLAYER_MIGRATIONS: playerMigrations },
            },
          }),
        ],
        test: {
          name: "gateway-identity",
          include: ["tests/FR-00006/gateway/**/*.test.ts"],
          testTimeout: WORKER_TEST_TIMEOUT,
        },
      },
      {
        plugins: [
          cloudflareTest({
            wrangler: { configPath: "./apps/studio-api/wrangler.jsonc", environment: "dev" },
            // Test values only: a test SuperAdmin, a stand-in Cloudflare API
            // address, and a fake token (DD-021). No real account is used.
            miniflare: {
              bindings: {
                SUPERADMIN_EMAIL: "superadmin@example.invalid",
                CF_ACCOUNT_ID: "fr-00004-test-account",
                CF_API_BASE: "https://cloudflare-api.fr-00004.test/client/v4",
                ACCESS_GROUP_ID: "fr-00004-test-group",
                CF_ACCESS_GROUP_TOKEN: "fr-00004-fake-access-group-token",
                TEST_MIGRATIONS: contentMigrations,
              },
            },
          }),
        ],
        test: {
          name: "studio-api",
          include: ["tests/FR-00003/api/**/*.test.ts", "tests/FR-00004/api/**/*.test.ts"],
          testTimeout: WORKER_TEST_TIMEOUT,
        },
      },
      {
        plugins: [
          cloudflareTest({
            wrangler: { configPath: "./apps/studio-web/wrangler.jsonc", environment: "dev" },
            // The STUDIO_API binding needs a service of that name to start the
            // runtime. The tests pass their own stand-in studio-api instead.
            miniflare: {
              workers: [
                {
                  name: "dd-dev-studio-api",
                  modules: true,
                  compatibilityDate: "2026-10-07",
                  script: "export default { fetch() { return new Response(null, { status: 404 }); } };",
                },
              ],
            },
          }),
        ],
        test: {
          name: "studio-web",
          include: ["tests/FR-00003/web/**/*.test.ts", "tests/FR-00004/web/**/*.test.ts"],
          testTimeout: WORKER_TEST_TIMEOUT,
        },
      },
      {
        plugins: [
          cloudflareTest({
            wrangler: { configPath: "./apps/player/wrangler.jsonc", environment: "dev" },
            miniflare: { bindings: { TEST_MIGRATIONS: playerMigrations } },
          }),
        ],
        test: {
          name: "player",
          include: ["tests/FR-00006/player/**/*.test.ts"],
          testTimeout: WORKER_TEST_TIMEOUT,
        },
      },
      {
        plugins: [react()],
        test: {
          name: "studio-ui",
          environment: "jsdom",
          include: ["tests/FR-00003/ui/**/*.test.tsx", "tests/FR-00004/ui/**/*.test.{ts,tsx}"],
          // FR-00004: browser features Mantine needs that jsdom lacks.
          setupFiles: ["tests/FR-00004/ui/setup.ts"],
        },
      },
    ],
  },
});
