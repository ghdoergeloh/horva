import { defineConfig, mergeConfig } from "vitest/config";

import { viteReactConfig } from "@horva/vitest/config";

export default mergeConfig(
  viteReactConfig,
  defineConfig({
    test: {
      coverage: {
        // Fixed floors below the measured values. Raise them by hand.
        thresholds: {
          statements: 3,
          branches: 1,
          functions: 1,
          lines: 3,
        },
      },
    },
  }),
);
