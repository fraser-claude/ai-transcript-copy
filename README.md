# AI Transcript Copy

The popular AI chats (Claude etc.) let you copy individual responses, but I often want to copy the entire transcript for my notes, save temporary chats, get feedback from another LLM, or simply provide context to another LLM. My transcripts feel locked in the chat. This solves exactly that: consistently formatted markdown transcripts for maximum portability across AI vendors.

Use cases:

- Easily save your transcripts to your notes (Obsidian, etc.).
- Copy and paste transcripts from one chat to another for feedback and validation.
- Research problem areas and solutions in one LLM (e.g. Gemini) and easily provide it to another for planning and execution (e.g. Claude Code).

These bookmarklets copy AI chat transcripts from ChatGPT, Gemini, NotebookLM, and Claude to your clipboard in both html and markdown-formatted plaintext, designed for pasting into Google Docs, Obsidian, Notion, plaintext editors, or another AI chat. This supports as many features/artifacts as feasible (e.g. full deep research reports) while structuring the transcript for human and LLM readability.

For example:

```markdown
# Transcript Title

## Q1: abbreviated user message

[full user message]

## A1

[assistant message]

## Q1: abbreviated user message

[full user message]

## A2

[assistant response]

### [nested assistant headers]

...
```

Two versions are provided:

- Full: Supports as many chat features as possible without worrying about bookmarklet size.
- Basic: basic user/assistant messages, maintaining a small size and feature set for compatibility with mobile OSes and sites. (It seems a bookmark > 6k bytes won't sync to iOS Chrome.)

## Why a bookmarklet instead of an extension?

I wanted something I could use on desktop and mobile Chrome in iOS. It should also work in other browsers.

## Install

Visit the **[install page](https://fraser.github.io/ai-transcript-copy/)** and drag the button to your bookmarks bar.

Make sure your bookmarks bar is visible first: `Ctrl+Shift+B` on Windows/Linux, `Cmd+Shift+B` on Mac.

## Usage

1. Open a conversation in a supported Claude, Gemini, etc. chat.
2. Click the **AI Transcript Copy** bookmark.
3. A dialog appears — choose which prompt to start copying from.
4. Click **OK**. Paste into your note-taking tool.

## Supported sites

- ChatGPT (`chatgpt.com`)
- Gemini (`gemini.google.com`)
- NotebookLM (`notebooklm.google.com`)
- Claude (`claude.ai`)

## Known Limitations

- **ChatGPT Deep Research:** Responses are rendered in a sandboxed cross-origin iframe that bookmarklet scripts cannot access. Workaround: use ChatGPT's built-in *Export* or *Copy response* button inside the deep research panel.


## Contributing

Pull requests and issues welcome!

