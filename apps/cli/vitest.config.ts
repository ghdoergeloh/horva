import { defineConfig, mergeConfig } from "vitest/config";

import { viteConfig } from "@horva/vitest/config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      coverage: {
        thresholds: {
          autoUpdate: true,
          statements: 8.4,
          branches: 8.09,
          functions: 10.09,
          lines: 8.31,
        },
      },
    },
  }),
);
