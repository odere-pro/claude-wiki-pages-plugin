// ESLint config mirrors the claude-agentline layout. The eslint + typescript-eslint
// devDependencies are pinned in package.json and the lint gate runs in CI via
// tests/gates/gate-11-eslint.sh (`bun run lint`).
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
