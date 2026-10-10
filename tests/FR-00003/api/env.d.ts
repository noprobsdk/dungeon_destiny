// Tells the Workers test types which module is the studio-api Worker, so
// `exports.default` in the tests is typed. This is not a binding declaration;
// bindings come from `wrangler types`.
declare namespace Cloudflare {
  interface GlobalProps {
    mainModule: typeof import("../../../apps/studio-api/src/index");
  }
  // FR-00004: test-only binding with Content D1's migrations.
  interface Env {
    TEST_MIGRATIONS: import("cloudflare:test").D1Migration[];
  }
}
