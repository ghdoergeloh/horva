import { defineConfig, mergeConfig } from "vitest/config";

import { viteConfig } from "@horva/vitest/config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      coverage: {
        thresholds: {
          autoUpdate: true,
          statements: 8.61,
          branches: 8.17,
          functions: 10.47,
          lines: 8.5,
        },
      },
    },
  }),
);
