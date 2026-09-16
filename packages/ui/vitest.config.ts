import { defineConfig, mergeConfig } from "vitest/config";

import { viteReactConfig } from "@horva/vitest/config";

export default mergeConfig(
  viteReactConfig,
  defineConfig({
    test: {
      coverage: {
        thresholds: {
          autoUpdate: true,
          statements: 0,
          branches: 0,
          functions: 0,
          lines: 0,
        },
      },
    },
  }),
);
