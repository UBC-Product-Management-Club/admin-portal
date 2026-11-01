import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["build", ".react-router", "node_modules"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        {
          allowExportNames: [
            "meta",
            "links",
            "loader",
            "clientLoader",
            "action",
            "clientAction",
            "HydrateFallback",
            "ErrorBoundary",
            "Layout",
          ],
        },
      ],
    },
  },
  {
    // Generated shadcn/ui files export variant helpers alongside components.
    files: ["app/components/ui/**"],
    rules: { "react-refresh/only-export-components": "off" },
  },
  prettier,
);
