/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: [
    "@peerahat/config/eslint/base",
    "next/core-web-vitals",
  ],
  rules: {
    // Frontend must NEVER hold business logic, mock data, or DB calls.
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["@prisma/*", "prisma/*", "@nestjs/*"],
            message:
              "apps/web must not import from the API layer. Use @peerahat/types and apiClient.",
          },
        ],
      },
    ],
    "no-restricted-syntax": [
      "error",
      {
        selector:
          "VariableDeclarator[id.name=/^MOCK_|^INITIAL_/i][init.type=/Array|Object/Expression/]",
        message:
          "Mock data is not allowed in apps/web. Fetch from the API via apiClient.",
      },
    ],
  },
};
