# AI Transcript Copy

The popular AI chats (Claude etc.) let you copy individual responses, but I often want to copy the entire transcript for my notes, save temporary chats, get feedback from another LLM, or simply provide context to another LLM. My transcripts feel locked in the chat. This solves exactly that: consistently formatted markdown transcripts for maximum portability across AI vendors.

Use cases:

- Easily save your transcripts to your notes (Obsidian, etc.).
- Copy and paste transcripts from one chat to another for feedback and validation.
- Research problem areas and solutions in one LLM (e.g. Gemini) and easily provide it to another for planning and execution (e.g. Claude Code).

These bookmarklets copy AI chat transcripts from ChatGPT, Gemini, NotebookLM, and Claude to your clipboard in both html and markdown-formatted plaintext, designed for pasting into Google Docs, Obsidian, Notion, plaintext editors, or another AI chat. This supports as many features/artifacts as feasible (e.g. full deep research reports) while structuring the transcript for human and LLM readability.

For example:

```markdown
# <Transcript Title>

[context: link to conversation, model, time]

## Q1: <abbreviated user message>

[full user message]

## A1

[assistant message]

## Q2: <abbreviated user message>

[full user message]

## A2

[assistant response]

### [nested assistant headers]

...
```

Two versions are provided:

- Standard: Supports as many chat features as possible without worrying about bookmarklet size.
- Basic: basic user/assistant messages, small enough for Chrome's bookmark sync service (~6 KB limit). For iOS, the Standard bookmarklet can also be installed manually — see the install page for step-by-step instructions for iOS Chrome and Safari.

## Why a bookmarklet instead of an extension?

I wanted something I could use on desktop and mobile Chrome in iOS. It should also work in other browsers.

## Install

Visit the **[install page](https://fraser.github.io/ai-transcript-copy/)** and drag the button to your bookmarks bar.

Make sure your bookmarks bar is visible first: `Ctrl+Shift+B` on Windows/Linux, `Cmd+Shift+B` on Mac.

## Usage

1. Open a conversation in a supported Claude, Gemini, etc. chat.
2. Click the **AI Transcript Copy** bookmark.

## Supported sites

- ChatGPT (`chatgpt.com`)
- Gemini (`gemini.google.com`)
- NotebookLM (`notebooklm.google.com`)
- Claude (`claude.ai`)

## Known Limitations

- **Fragile:** This will break if (when) vendors change their chat DOM structure. But, as long as I'm using it I'll keep it updated. Please file issues if it breaks.
- **ChatGPT Deep Research:** Responses are rendered in a sandboxed cross-origin iframe that bookmarklet scripts cannot access. Workaround: use ChatGPT's built-in *Export* or *Copy response* button inside the deep research panel.


## Contributing

Pull requests and issues welcome!

