import { defineConfig, mergeConfig } from "vitest/config";

import { viteReactConfig } from "@horva/vitest/config";

export default mergeConfig(
  viteReactConfig,
  defineConfig({
    test: {
      coverage: {
        thresholds: {
          autoUpdate: true,
          statements: 0.58,
          branches: 0.23,
          functions: 0.46,
          lines: 0.58,
        },
      },
    },
  }),
);
