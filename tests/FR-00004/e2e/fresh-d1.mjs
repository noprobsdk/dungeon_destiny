// FR-00004: empties the end-to-end test's local state before every run: its
// local Content D1, so every run starts from an empty database, and its own
// Wrangler dev registry, so no entry left by an earlier, stopped run is used.
// It only ever removes these two folders under apps/studio-api/.wrangler/.
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

for (const name of ["e2e-content-d1", "e2e-registry"]) {
  const folder = fileURLToPath(new URL(`../../../apps/studio-api/.wrangler/${name}`, import.meta.url));
  rmSync(folder, { recursive: true, force: true });
}
console.log("FR-00004: local Content D1 and dev registry for the end-to-end test emptied");
