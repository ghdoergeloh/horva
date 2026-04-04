import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({
        exclude: ["@timetracker/core", "@timetracker/db"],
      }),
    ],
    resolve: {
      alias: { "~": path.resolve(__dirname, "src/main") },
    },
  },
  preload: {
    plugins: [
      externalizeDepsPlugin({
        exclude: ["@timetracker/core", "@timetracker/db"],
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
