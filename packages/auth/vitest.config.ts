import { defineConfig, mergeConfig } from "vitest/config";

import { viteConfig } from "@repo/vitest/config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      coverage: {
        thresholds: {
          autoUpdate: true,
          statements: 0,
          branches: 100,
          functions: 0,
          lines: 0,
        },
      },
    },
  }),
);
