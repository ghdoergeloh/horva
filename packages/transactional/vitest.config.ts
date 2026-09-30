import { defineConfig, mergeConfig } from "vitest/config";

import { viteConfig } from "@horva/vitest/config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      coverage: {
        // Fixed floors below the measured values. Raise them by hand.
        thresholds: {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
      },
    },
  }),
);
