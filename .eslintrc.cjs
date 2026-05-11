/**
 * ESLint config — root.
 *
 * TS strict + Zod boundary discipline (per D-25). Flat config compatible.
 * Each package can extend / override via its own .eslintrc.cjs if needed.
 */

/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["./tsconfig.base.json", "./packages/*/tsconfig.json", "./apps/*/tsconfig.json"],
    // packages can extend their own configs by adding to this array
    tsconfigRootDir: __dirname,
    ecmaVersion: 2022,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked",
  ],
  rules: {
    // D-25: no `enum`s — use string-literal unions or `as const` objects
    "no-restricted-syntax": [
      "error",
      {
        selector: "TSEnumDeclaration",
        message: "Use string-literal unions or `as const` objects instead of `enum` (per D-25). Better tree-shaking; plays well with Zod.",
      },
    ],
    // D-25: require `import type` for type-only imports
    "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
    // CLAUDE.md: comments are rare; never describe WHAT
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    // Zod schemas drive structural types — allow inferred types
    "@typescript-eslint/no-explicit-any": ["error", { fixToUnknown: true, ignoreRestArgs: false }],
    // Internal code trusts itself (per CLAUDE.md "validate at boundaries"); explicit return types not required
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
  },
  ignorePatterns: [
    "node_modules",
    "dist",
    ".turbo",
    "coverage",
    "**/*.config.cjs",
    "**/*.config.js",
    "**/*.config.mjs",
    "**/*.config.ts",
  ],
};
