import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/.turbo/**",
      "packages/data/generated/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": "error",
      eqeqeq: ["error", "always"],
    },
  },
  {
    // Tooling config that has to stay CommonJS to be loaded by its own tool.
    files: ["**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { module: "writable", require: "readonly", __dirname: "readonly" },
    },
  },
  {
    // The I/O adapter is the only boundary with the system, so stdout is its job.
    files: ["packages/*/scripts/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },
);
