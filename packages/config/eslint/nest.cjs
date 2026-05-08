/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ["@peerahat/config/eslint/base"],
  parserOptions: {
    sourceType: "module",
  },
  rules: {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
  },
};
