import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    files: ["*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        document: "readonly",
        window: "readonly",
        location: "readonly",
        alert: "readonly",
        console: "readonly",
        navigator: "readonly",
        ClipboardItem: "readonly",
        Array: "readonly",
        Number: "readonly",
        Error: "readonly",
        Promise: "readonly",
        setTimeout: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "eqeqeq": "off",
    },
  },
];
