import { defineConfig, mergeConfig } from "vitest/config";

import { viteReactConfig } from "@repo/vitest/config";

export default mergeConfig(
  viteReactConfig,
  defineConfig({
    test: {
      coverage: {
        thresholds: {
          autoUpdate: true,
          statements: 20.63,
          branches: 50,
          functions: 35.71,
          lines: 18.03,
        },
      },
    },
  }),
);
