module.exports = {
  root: true,
  extends: [require.resolve("@peerahat/config/eslint/base")],
  parserOptions: {
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  env: { browser: true, es2022: true },
};
