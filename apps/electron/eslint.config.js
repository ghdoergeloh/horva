import { defineConfig } from "eslint/config";

import { baseConfig } from "@repo/eslint-config/base";
import { reactConfig } from "@repo/eslint-config/react";

export default defineConfig(
  {
    ignores: [
      "out/**",
      "dist-electron/**",
      "src/renderer/src/routeTree.gen.ts",
    ],
  },
  baseConfig,
  reactConfig,
  {
    files: ["src/renderer/src/**"],
    rules: {
      "import/no-unresolved": "off",
    },
  },
  {
    files: ["src/renderer/src/routes/**", "src/renderer/src/contexts/**"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
);
