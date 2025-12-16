import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.jest,
        describe: "readonly",
        test: "readonly",
        expect: "readonly",
        it: "readonly",
        beforeEach: "readonly",
        fail: "readonly"
      }
    },
    rules: {
      "indent": ["error", 2, { "SwitchCase": 1 }],
      "no-unused-vars": "warn",
      "no-console": "off",
      "no-irregular-whitespace": "off",
      "no-misleading-character-class": "off"
    }
  },
  {
    ignores: ["node_modules/", "coverage/"]
  }
];
