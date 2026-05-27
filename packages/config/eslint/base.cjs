/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: false,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "import"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "prettier",
  ],
  rules: {
    "import/order": [
      "warn",
      {
        groups: [
          "builtin",
          "external",
          "internal",
          ["parent", "sibling", "index"],
        ],
        "newlines-between": "always",
        alphabetize: { order: "asc", caseInsensitive: true },
      },
    ],
  },
  // TypeScript-only rules. Scoped via overrides so they don't fire on plain
  // .js files (Next.js lints those with its own parser, which lacks the AST
  // info @typescript-eslint rules need).
  overrides: [
    {
      files: ["*.ts", "*.tsx", "*.cts", "*.mts"],
      rules: {
        "@typescript-eslint/consistent-type-imports": "error",
        "@typescript-eslint/no-unused-vars": [
          "error",
          { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
        ],
      },
    },
  ],
  ignorePatterns: ["dist", ".next", "node_modules", "coverage"],
};
