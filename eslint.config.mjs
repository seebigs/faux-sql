import { defineConfig } from "eslint/config";
import globals from "globals";

export default defineConfig([{
    languageOptions: {
        globals: {
            ...globals.node,
            ...globals.jest,
        },

        ecmaVersion: 2024,
        sourceType: "module",
    },

    rules: {
        indent: ["error", 4],
        "arrow-body-style": "off",
        "consistent-return": "off",
        "import/extensions": "off",
        "import/no-unresolved": "off",
        "max-len": "off",
        "no-await-in-loop": "off",
        "no-console": "off",
        "no-multiple-empty-lines": "off",
        "no-param-reassign": "off",
        "padded-blocks": "off",
        "spaced-comment": "off",
    },
}]);
