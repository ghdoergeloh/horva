import { defineConfig, mergeConfig } from "vitest/config";

import { viteConfig } from "@horva/vitest/config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // The first createTestDatabase() of a file migrates PGlite, which
      // takes seconds on a busy CI runner.
      hookTimeout: 30_000,
      coverage: {
        // Fixed floors below the measured values. Raise them by hand.
        thresholds: {
          statements: 60,
          branches: 63,
          functions: 55,
          lines: 65,
        },
      },
    },
  }),
);
