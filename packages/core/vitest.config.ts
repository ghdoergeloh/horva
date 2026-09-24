import { defineConfig, mergeConfig } from "vitest/config";

import { viteConfig } from "@horva/vitest/config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // slot.service.spec.ts / task.service.spec.ts run against a real
      // Postgres and share its tables across the whole file; running test
      // files in parallel truncates/mutates rows out from under each other
      // (and can deadlock on the TRUNCATE). Sequential files, parallel tests
      // within each file (the default) is fine — files just don't overlap.
      fileParallelism: false,
      coverage: {
        thresholds: {
          autoUpdate: true,
          statements: 59.94,
          branches: 63.12,
          functions: 54.66,
          lines: 64.85,
        },
      },
    },
  }),
);
