// Tells the Workers test types which module is the gateway Worker, and
// declares the test-only bindings that vitest.config.ts adds for the
// gateway-identity project: a local Player D1 and its migrations. Real
// bindings come from `wrangler types`.
declare namespace Cloudflare {
  interface GlobalProps {
    mainModule: typeof import("../../../apps/gateway/src/index");
  }
  interface Env {
    TEST_PLAYER_D1: D1Database;
    TEST_PLAYER_MIGRATIONS: import("cloudflare:test").D1Migration[];
  }
}
