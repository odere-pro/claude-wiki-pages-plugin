// ESLint config mirrors the claude-agentline layout. The eslint + typescript-eslint
// devDependencies and the CI lint gate are wired in M5; this file is the stable target.
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  env: { node: true, es2024: true },
  rules: {
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/consistent-type-imports": "error",
  },
  ignorePatterns: ["dist/", "node_modules/"],
};
