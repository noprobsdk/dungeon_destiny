// Runs every Feature Request's tests with `pnpm test`, as one Vitest project
// per Worker plus one for Content Studio's pages.
//
// FR-00001: the gateway Worker's tests run in the Workers runtime with its
// Wrangler configuration and dev environment.
// FR-00003: the studio-api and studio-web Workers' tests run the same way, each
// with its own configuration; studio-api gets a test SuperAdmin email address.
// Content Studio's React pages run in jsdom.
import { cloudflareTest } from "@cloudflare/vitest-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

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
            miniflare: { bindings: { SUPERADMIN_EMAIL: "superadmin@example.invalid" } },
          }),
        ],
        test: { name: "studio-api", include: ["tests/FR-00003/api/**/*.test.ts"] },
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
        test: { name: "studio-web", include: ["tests/FR-00003/web/**/*.test.ts"] },
      },
      {
        plugins: [react()],
        test: {
          name: "studio-ui",
          environment: "jsdom",
          include: ["tests/FR-00003/ui/**/*.test.tsx"],
        },
      },
    ],
  },
});
