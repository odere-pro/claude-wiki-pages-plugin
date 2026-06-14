// ESLint 9 flat config — H21: upgraded from ESLint 8 (EOL) to ESLint 9.
// @typescript-eslint/eslint-plugin@8.18.2 and @typescript-eslint/parser@8.18.2
// already support ESLint 9's flat config format via their `configs` presets.
// The legacy .eslintrc.cjs is no longer loaded when this flat config is present
// (ESLint 9 uses flat config exclusively).
//
// gate-11-eslint.sh runs `bun run lint` which resolves to this file once
// ESLint 9 is installed via `bun install`.

// Flat config is executed by ESLint at runtime; correctness is verified by
// `bun run lint` (gate-11-eslint), not tsc. No @ts-check here — the
// @typescript-eslint plugin's `configs` types don't cleanly satisfy ESLint's
// flat `Config` type when spread, which is a known ecosystem gap, not a bug.
import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";

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
      // Faithful flat-config port of .eslintrc.cjs's
      //   extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"]
      // ESLint 9 dropped string `extends`, so the shareable presets are spread
      // explicitly: eslint:recommended, then typescript-eslint's eslint-recommended
      // (turns off base rules the TS rules supersede), then its recommended set.
      ...js.configs.recommended.rules,
      ...tseslint.configs["eslint-recommended"].overrides[0].rules,
      ...tseslint.configs.recommended.rules,
      // Project overrides (unchanged from .eslintrc.cjs)
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
];
