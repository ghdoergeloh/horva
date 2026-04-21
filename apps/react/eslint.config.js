import { defineConfig } from "eslint/config";

import { baseConfig, restrictEnvAccess } from "@horva/eslint-config/base";
import { reactConfig } from "@horva/eslint-config/react";

export default defineConfig(
  {
    ignores: [".next/**"],
  },
  baseConfig,
  reactConfig,
  restrictEnvAccess,
  {
    files: ["src/routes/**"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
);
