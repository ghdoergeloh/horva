import { cpSync } from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";

/**
 * Packages bundled into the main and preload builds instead of being loaded
 * from node_modules.
 *
 * Workspace packages expose `.default` conditions pointing at src/*.ts (no
 * prebuild step in dev). Electron's main process runs those files directly
 * through Node, which can't resolve .ts — so bundle them.
 *
 * @electric-sql/pglite stays external (it is a dependency): it loads its WASM
 * files from its own folder in node_modules.
 *
 * @orpc/* is bundled because its transitive deps (radash, type-fest) live
 * under pnpm's nested node_modules and electron-builder misses them when
 * copying production deps into app.asar.
 */
const bundled = [
  "@horva/contract",
  "@horva/core",
  "@horva/db",
  "@orpc/client",
  "@orpc/contract",
  "@orpc/server",
  "@orpc/tanstack-query",
];

/**
 * Copies the SQL migrations next to the main bundle (`out/main/drizzle`),
 * where `migrationsFolder()` of @horva/db finds them. The app migrates its
 * local database on start.
 */
const copyMigrations = {
  name: "copy-migrations",
  closeBundle() {
    cpSync(
      path.resolve(__dirname, "../../packages/db/drizzle"),
      path.resolve(__dirname, "out/main/drizzle"),
      { recursive: true },
    );
  },
};

export default defineConfig({
  main: {
    plugins: [copyMigrations],
    build: { externalizeDeps: { exclude: bundled } },
    resolve: {
      alias: { "~": path.resolve(__dirname, "src/main") },
    },
  },
  preload: {
    build: { externalizeDeps: { exclude: bundled } },
  },
  renderer: {
    root: "src/renderer",
    // The React app itself (apps/react) runs on 5173.
    server: { port: 5174, strictPort: true },
    plugins: [tailwindcss(), react()],
  },
});
