import { defineConfig } from "eslint/config";

import { baseConfig } from "@horva/eslint-config/base";
import { reactConfig } from "@horva/eslint-config/react";

export default defineConfig(
  {
    ignores: ["dist/**", ".turbo/**"],
  },
  baseConfig,
  reactConfig,
  {
    // Source outside this package (the shared Electron renderer) is linted
    // from its own package; don't double-lint from here.
    files: ["src/**"],
  },
);
