import { defineConfig, mergeConfig } from "vitest/config";

import { viteReactConfig } from "@horva/vitest/config";

export default mergeConfig(
  viteReactConfig,
  defineConfig({
    test: {
      coverage: {
        // Fixed floors below the measured values. Raise them by hand.
        thresholds: {
          statements: 17,
          branches: 15,
          functions: 14,
          lines: 16,
        },
      },
    },
  }),
);
