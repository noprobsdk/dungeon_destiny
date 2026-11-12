// Tells the Workers test types which module is the player Worker, and
// declares TEST_MIGRATIONS, a test-only binding that vitest.config.ts fills
// with Player D1's migrations. Real bindings come from `wrangler types`.
declare namespace Cloudflare {
  interface GlobalProps {
    mainModule: typeof import("../../../apps/player/src/index");
  }
  interface Env {
    TEST_MIGRATIONS: import("cloudflare:test").D1Migration[];
  }
}
