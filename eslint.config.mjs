import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

// Using a resilient configuration that avoids the specific 'next/core-web-vitals'
// circular reference seen with ESLint 9 in this environment.
// We enable standard JS and TS recommendations to ensure the gate works.

const eslintConfig = [
  js.configs.recommended,
  ...compat.config({
    extends: ["plugin:@typescript-eslint/recommended", "plugin:react-hooks/recommended"],
  }),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_"
      }]
    }
  }
];

export default eslintConfig;
