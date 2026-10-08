// FR-00001: runs the Worker tests in the real Workers runtime, using the
// gateway Worker's Wrangler configuration and its dev environment.
import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: {
        configPath: "./apps/gateway/wrangler.jsonc",
        environment: "dev",
      },
    }),
  ],
  test: {
    include: ["tests/FR-*/**/*.test.ts"],
  },
});
