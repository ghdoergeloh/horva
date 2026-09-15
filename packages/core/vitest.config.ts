import { defineConfig, mergeConfig } from "vitest/config";

import { viteConfig } from "@horva/vitest/config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      coverage: {
        thresholds: {
          autoUpdate: true,
          statements: 12.12,
          branches: 13.76,
          functions: 14.28,
          lines: 13.23,
        },
      },
    },
  }),
);
