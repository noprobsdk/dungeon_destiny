// FR-00003: builds Content Studio's React pages into dist/, which Wrangler
// uploads as studio-web's static assets (DD-020).
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist", emptyOutDir: true },
});
