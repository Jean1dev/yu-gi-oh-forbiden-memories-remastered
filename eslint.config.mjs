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
    // The other half of the `domain-cores-are-pure` boundary rule: that one
    // forbids importing `node:*`, but the network globals are never imported,
    // so dependency-cruiser cannot see them. A domain package describes the
    // game; reaching the network or the browser's storage is the job of the
    // adapters in scripts/ and apps/.
    files: ["packages/*/src/**/*.ts"],
    ignores: ["packages/*/src/**/*.test.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        {
          name: "fetch",
          message: "Domain packages take already-read content; fetching belongs to an adapter.",
        },
        {
          name: "XMLHttpRequest",
          message: "Domain packages take already-read content; fetching belongs to an adapter.",
        },
        {
          name: "localStorage",
          message: "Domain packages hold no session state; persistence belongs to an adapter.",
        },
      ],
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
