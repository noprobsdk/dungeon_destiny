// Tells the Workers test types which module is the gateway Worker, so
// `exports.default` in the tests is typed. Bindings come from `wrangler types`.
declare namespace Cloudflare {
  interface GlobalProps {
    mainModule: typeof import("../../apps/gateway/src/index");
  }
}
