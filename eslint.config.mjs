import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    files: ["src/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      parserOptions: {
        // Allow top-level return (entry files use it; valid inside the build-time IIFE wrapper)
        ecmaFeatures: { globalReturn: true },
      },
      globals: {
        document: "readonly",
        window: "readonly",
        location: "readonly",
        alert: "readonly",
        console: "readonly",
        navigator: "readonly",
        ClipboardItem: "readonly",
        MutationObserver: "readonly",
        Blob: "readonly",
        Array: "readonly",
        Number: "readonly",
        Error: "readonly",
        Promise: "readonly",
        setTimeout: "readonly",
        parseInt: "readonly",
        Map: "readonly",
        Set: "readonly",
        Object: "readonly",
        // Cross-file names: defined in one src/ file, referenced in another after concatenation
        id: "readonly",
        showToast: "readonly",
        stripMarkdown: "readonly",
        htmlToText: "readonly",
        formatDate: "readonly",
        getModel: "readonly",
        writeTranscript: "readonly",
        copyChatGPTTranscript: "readonly",
        copyGeminiTranscript: "readonly",
        copyNotebookLMTranscript: "readonly",
        copyClaudeTranscript: "readonly",
        demoteHeadings: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", {
        // Cross-file names are defined in one src/ file and used in another after build-time concatenation
        "varsIgnorePattern": "^(showToast|stripMarkdown|htmlToText|formatDate|getModel|writeTranscript|demoteHeadings|copyChatGPTTranscript|copyGeminiTranscript|copyNotebookLMTranscript|copyClaudeTranscript)$",
      }],
      "eqeqeq": "off",
    },
  },
];
