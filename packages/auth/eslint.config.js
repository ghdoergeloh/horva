import { defineConfig } from "eslint/config";

import { baseConfig, restrictEnvAccess } from "@timetracker/eslint-config/base";

export default defineConfig(
  {
    ignores: ["script/**"],
  },
  baseConfig,
  restrictEnvAccess,
);
