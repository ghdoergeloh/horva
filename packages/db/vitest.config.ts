import { defineConfig, mergeConfig } from "vitest/config";

import { viteConfig } from "@horva/vitest/config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // Migrating PGlite takes seconds on a busy machine.
      testTimeout: 15_000,
      coverage: {
        // Fixed floors below the measured values. Raise them by hand. They
        // hold without TEST_DATABASE_URL, where postgres.spec.ts is skipped.
        thresholds: {
          statements: 65,
          branches: 70,
          functions: 55,
          lines: 64,
        },
      },
    },
  }),
);
