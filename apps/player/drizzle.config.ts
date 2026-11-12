// FR-00006: drizzle-kit generates Player D1's numbered SQL migrations from
// src/db/schema.ts into migrations/, which Wrangler applies (DD-024).
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./migrations",
});
