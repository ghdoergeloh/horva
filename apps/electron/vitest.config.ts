import { defineConfig, mergeConfig } from "vitest/config";

import { viteConfig } from "@horva/vitest/config";

// Tests of the main process, in Node.js. The renderer is the React app of
// apps/react with its own tests; the Playwright tests start the whole app.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // The first createTestDatabase() of a file migrates PGlite, which
      // takes seconds on a busy CI runner.
      hookTimeout: 30_000,
      coverage: {
        exclude: [
          // Wiring of Electron itself (window, IPC, preload, renderer
          // entry); the Playwright tests start it.
          "src/main/index.ts",
          "src/main/db.ts",
          "src/main/setup.ts",
          "src/main/orpc/handler.ts",
          "src/preload/**",
          "src/renderer/**",
        ],
        // Fixed floors below the measured values. Raise them by hand.
        thresholds: {
          statements: 14,
          branches: 100,
          functions: 4,
          lines: 14,
        },
      },
    },
  }),
);
