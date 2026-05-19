import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({
        // Workspace packages expose `.default` conditions pointing at src/*.ts
        // (no prebuild step in dev). Electron's main process runs those files
        // directly through Node, which can't resolve .ts — so bundle them.
        //
        // We also bundle @orpc/* because their transitive deps (radash,
        // type-fest) live under pnpm's nested node_modules and electron-builder
        // misses them when copying production deps into app.asar.
        exclude: [
          "@horva/contract",
          "@horva/core",
          "@horva/db",
          "@orpc/client",
          "@orpc/contract",
          "@orpc/server",
          "@orpc/tanstack-query",
        ],
      }),
    ],
    resolve: {
      alias: { "~": path.resolve(__dirname, "src/main") },
    },
  },
  preload: {
    plugins: [
      externalizeDepsPlugin({
        exclude: [
          "@horva/contract",
          "@horva/core",
          "@horva/db",
          "@orpc/client",
          "@orpc/contract",
          "@orpc/server",
          "@orpc/tanstack-query",
        ],
      }),
    ],
  },
  renderer: {
    root: "src/renderer",
    plugins: [
      tailwindcss(),
      tanstackRouter({
        target: "react",
        autoCodeSplitting: true,
        routesDirectory: path.resolve(__dirname, "src/renderer/src/routes"),
        generatedRouteTree: path.resolve(
          __dirname,
          "src/renderer/src/routeTree.gen.ts",
        ),
      }),
      react(),
    ],
    resolve: {
      alias: { "~": path.resolve(__dirname, "src/renderer/src") },
    },
  },
});
