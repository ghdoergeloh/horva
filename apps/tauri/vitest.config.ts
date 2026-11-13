import { defineConfig, mergeConfig } from "vitest/config";

import { viteConfig } from "@horva/vitest/config";

// Tests of the backend sidecar, in Node.js. The webview is the React app of
// apps/react with its own tests; the Playwright test runs the webview with
// the sidecar, and `cargo test` covers the Rust shell.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // The first createTestDatabase() of a file migrates PGlite, which
      // takes seconds on a busy CI runner.
      hookTimeout: 30_000,
      coverage: {
        exclude: [
          // Wiring: stdio and the database of the sidecar, and the
          // webview; the Playwright test starts them.
          "src/backend/index.ts",
          "src/backend/db.ts",
          "src/webview/**",
          "scripts/**",
          "*.config.ts",
        ],
        // Fixed floors below the measured values. Raise them by hand.
        thresholds: {
          statements: 72,
          branches: 82,
          functions: 40,
          lines: 70,
        },
      },
    },
  }),
);
