// ESLint 9 flat config — H21: upgraded from ESLint 8 (EOL) to ESLint 9.
// @typescript-eslint/eslint-plugin@8.18.2 and @typescript-eslint/parser@8.18.2
// already support ESLint 9's flat config format via their `configs` presets.
// The legacy .eslintrc.cjs is no longer loaded when this flat config is present
// (ESLint 9 uses flat config exclusively).
//
// gate-11-eslint.sh runs `bun run lint` which resolves to this file once
// ESLint 9 is installed via `bun install`.

// @ts-check
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  // Global ignores (replaces ignorePatterns in .eslintrc.cjs)
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  // TypeScript source files
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2024,
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      // Disable base no-unused-vars in favour of the TypeScript-aware version
      "no-unused-vars": "off",
      // Same rules as .eslintrc.cjs — no behaviour change, only config format
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
];
