# AI Transcript Copy

A bookmarklet that copies AI chat transcripts — ChatGPT, Gemini, NotebookLM, and Claude — to your clipboard as formatted rich text, ready to paste into Google Docs, Obsidian, Notion, or another AI.

## Install

Visit the **[install page](https://fraser.github.io/ai-transcript-copy/)** and drag the button to your bookmarks bar.

Make sure your bookmarks bar is visible first: `Ctrl+Shift+B` on Windows/Linux, `Cmd+Shift+B` on Mac.

## Usage

1. Open a conversation on a supported AI site.
2. Click the **AI Transcript Copy** bookmark.
3. A dialog appears — choose which prompt to start copying from.
4. Click **OK**. Paste into your note-taking tool.

## Supported sites

- ChatGPT (`chatgpt.com`)
- Gemini (`gemini.google.com`)
- NotebookLM (`notebooklm.google.com`)
- Claude (`claude.ai`)

## Limitations

- **ChatGPT Deep Research:** Responses are rendered in a sandboxed cross-origin iframe that bookmarklet scripts cannot access. Workaround: use ChatGPT's built-in *Export* or *Copy response* button inside the deep research panel.
- **Claude Artifacts:** Sidebar artifact content (generated code files, HTML previews, etc.) is rendered in an isolated iframe and cannot be copied. The surrounding chat response text is captured normally.
- **Gemini Deep Research Citations:** Inline citation markers are stripped from the output because they contain no link or reference text — only a source index number.
- **Gemini Canvas / NotebookLM Studio:** Canvas-rendered content may not be fully captured if it is displayed outside the standard message elements.

## Contributing

Pull requests and issues welcome! Note that the DOM selectors in `ai-transcript-copy.js` are the most fragile part — they must match the current structure of each AI service and will break when those sites update their HTML.

After changing `ai-transcript-copy.js`, run `pnpm run check` and commit the updated `docs/index.html`.
