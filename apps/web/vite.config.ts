import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Reuse the Electron renderer source as the canonical React app. Web-only
// overrides live in src/overrides/ and are injected via resolve.alias before
// the shared root alias kicks in.
const RENDERER_ROOT = path.resolve(__dirname, "../electron/src/renderer/src");

export default defineConfig({
  plugins: [
    tailwindcss(),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: path.resolve(RENDERER_ROOT, "routes"),
      generatedRouteTree: path.resolve(RENDERER_ROOT, "routeTree.gen.ts"),
    }),
    react(),
  ],
  resolve: {
    alias: [
      // Web-specific overrides take precedence over the shared renderer.
      {
        find: /^~\/lib\/orpc(\.js)?$/,
        replacement: path.resolve(__dirname, "src/overrides/orpc.ts"),
      },
      {
        find: /^~\/components\/SetupGate(\.js)?$/,
        replacement: path.resolve(__dirname, "src/overrides/SetupGate.tsx"),
      },
      // Everything else falls through to the shared renderer.
      { find: "~", replacement: RENDERER_ROOT },
    ],
  },
  server: {
    // Electron's renderer dev server already uses 5173; web binds 5174 so
    // both can run side-by-side with `pnpm dev`.
    port: 5174,
    strictPort: true,
  },
});
