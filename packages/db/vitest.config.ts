import { defineConfig, mergeConfig } from "vitest/config";

import { viteConfig } from "@horva/vitest/config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // Migrating a PGlite folder takes up to half a minute on a CI runner
      // that runs the tests of several packages at once.
      testTimeout: 60_000,
      coverage: {
        // Fixed floors below the measured values. Raise them by hand. They
        // hold without TEST_DATABASE_URL, where postgres.spec.ts is skipped.
        thresholds: {
          statements: 80,
          branches: 72,
          functions: 80,
          lines: 80,
        },
      },
    },
  }),
);
