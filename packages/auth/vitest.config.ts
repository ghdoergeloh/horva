import { defineConfig, mergeConfig } from "vitest/config";

import { viteConfig } from "@horva/vitest/config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // Password hashing and the first migration of PGlite take seconds on
      // a busy machine.
      testTimeout: 30_000,
      coverage: {
        // Fixed floors below the measured values. Raise them by hand.
        thresholds: {
          statements: 65,
          branches: 100,
          functions: 55,
          lines: 65,
        },
      },
    },
  }),
);
