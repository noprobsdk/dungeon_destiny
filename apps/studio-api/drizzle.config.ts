// FR-00004: drizzle-kit generates Content D1's numbered SQL migrations from
// src/db/schema.ts into migrations/, which Wrangler applies (DD-020).
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./migrations",
});
