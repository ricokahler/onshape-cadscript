import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/.vitepress/cache/**", "apps/docs/public/api/**", "coverage.json"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["extension/chrome/*.js"],
    languageOptions: {
      globals: {
        AbortController: "readonly",
        CustomEvent: "readonly",
        URL: "readonly",
        chrome: "readonly",
        document: "readonly",
        fetch: "readonly",
        window: "readonly",
      },
    },
  },
);
