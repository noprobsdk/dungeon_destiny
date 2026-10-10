// Runs every Feature Request's tests with `pnpm test`, as one Vitest project
// per Worker plus one for Content Studio's pages.
//
// FR-00001: the gateway Worker's tests run in the Workers runtime with its
// Wrangler configuration and dev environment.
// FR-00003: the studio-api and studio-web Workers' tests run the same way, each
// with its own configuration; studio-api gets a test SuperAdmin email address.
// FR-00004: studio-api's tests also get a local Content D1 with every
// migration applied, and test values for the Access group sync.
// Content Studio's React pages run in jsdom.
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// FR-00004: Content D1's migrations, applied to an empty local database before
// every studio-api test.
const contentMigrations = await readD1Migrations("./apps/studio-api/migrations");

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [
          cloudflareTest({
            wrangler: { configPath: "./apps/gateway/wrangler.jsonc", environment: "dev" },
          }),
        ],
        test: { name: "gateway", include: ["tests/FR-00001/**/*.test.ts"] },
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
        test: { name: "studio-api", include: ["tests/FR-00003/api/**/*.test.ts", "tests/FR-00004/api/**/*.test.ts"] },
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
        test: { name: "studio-web", include: ["tests/FR-00003/web/**/*.test.ts", "tests/FR-00004/web/**/*.test.ts"] },
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
