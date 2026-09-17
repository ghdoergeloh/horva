import jsxA11y from "eslint-plugin-jsx-a11y";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig } from "eslint/config";
import globals from "globals";

// jsx-a11y's recommended config ships every rule as "error"; downgrade to
// "warn" for the same reason as the complexity rules in base.js - it's being
// enforced for the first time against existing code, so start loose and
// tighten once the codebase is actually clean.
const jsxA11yWarnRules = Object.fromEntries(
  Object.entries(jsxA11y.flatConfigs.recommended.rules)
    .filter(([, value]) => value !== "off" && value[0] !== "off")
    .map(([rule, value]) => [
      rule,
      Array.isArray(value) ? ["warn", ...value.slice(1)] : "warn",
    ]),
);

/** Composable React config - use with baseConfig */
export const reactConfig = defineConfig({
  files: ["**/*.{ts,tsx}"],
  extends: [
    reactPlugin.configs.flat["recommended"],
    reactPlugin.configs.flat["jsx-runtime"],
    reactHooks.configs.flat["recommended-latest"],
    reactRefresh.configs.vite,
    jsxA11y.flatConfigs.recommended,
  ],
  rules: jsxA11yWarnRules,
  settings: {
    react: {
      version: "detect",
    },
  },
  languageOptions: {
    ecmaVersion: 2020,
    globals: globals.browser,
  },
});
