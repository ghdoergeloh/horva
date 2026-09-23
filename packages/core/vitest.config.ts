import { defineConfig, mergeConfig } from "vitest/config";

import { viteConfig } from "@repo/vitest/config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      coverage: {
        thresholds: {
          autoUpdate: true,
          statements: 87.5,
          branches: 100,
          functions: 100,
          lines: 85.71,
        },
      },
    },
  }),
);
