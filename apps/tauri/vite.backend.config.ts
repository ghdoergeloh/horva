import { builtinModules } from "node:module";
import { defineConfig } from "vite";

/**
 * The backend sidecar as one ES module for Node.js, with all dependencies
 * inside: the bundle ships without node_modules.
 */
export default defineConfig({
  build: {
    ssr: "src/backend/index.ts",
    outDir: "dist/backend",
    emptyOutDir: true,
    target: "node24",
    sourcemap: false,
    rollupOptions: {
      // pg loads its native binding only when asked to; it is not installed.
      external: ["pg-native", ...builtinModules.map((m) => `node:${m}`)],
      output: { entryFileNames: "index.mjs" },
    },
  },
  ssr: { noExternal: true, target: "node" },
});
