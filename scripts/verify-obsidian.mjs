#!/usr/bin/env node
// Paste tmp/sample.html into Obsidian test note and write resulting markdown to disk.
// Usage: node scripts/verify-obsidian.mjs
//
// Reads tmp/sample.html and tmp/sample.md, writes them to the clipboard,
// then clears test-ai-transcript-copy.md, pastes, and writes tmp/verify-obsidian.md.

import puppeteer from 'puppeteer-core';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

function getArg(flag, fallback) {
    const i = process.argv.indexOf(flag);
    return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const htmlPath = getArg('--html', 'tmp/sample.html');
const textPath = getArg('--text', 'tmp/sample.md');
const OUTPUT = getArg('--output', 'tmp/verify-obsidian.md');

const html = readFileSync(htmlPath, 'utf8');
const text = readFileSync(textPath, 'utf8');

let browser;
try {
    browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
} catch {
    console.error('Cannot connect to Obsidian on localhost:9222.');
    console.error('Is Obsidian running with --remote-debugging-port=9222?');
    process.exit(1);
}

const pages = await browser.pages();

// Find the Obsidian main window
const page = pages.find(p => p.url().startsWith('app://obsidian.md'));
if (!page) {
    console.error('No Obsidian window found. Open pages:');
    for (const p of pages) console.error(`  ${p.url()}`);
    await browser.disconnect();
    process.exit(1);
}

await page.bringToFront();

// Open the test note via Obsidian's command palette / API
console.log('Opening test-ai-transcript-copy.md');
await page.evaluate(() => {
    const file = app.vault.getAbstractFileByPath('test-ai-transcript-copy.md');
    if (file) {
        app.workspace.openLinkText('test-ai-transcript-copy.md', '', false);
    } else {
        throw new Error('test-ai-transcript-copy.md not found in vault');
    }
});

// Wait for the note to open and render
await new Promise(r => setTimeout(r, 1000));

// Ensure we're in editing mode (source/live preview, not reading mode)
await page.evaluate(() => {
    const leaf = app.workspace.activeLeaf;
    if (leaf?.view?.getState()?.mode === 'preview') {
        leaf.view.setState({ mode: 'source' });
    }
});
await new Promise(r => setTimeout(r, 500));

// Write sample files to clipboard
console.log(`Setting clipboard from ${htmlPath} and ${textPath}`);
await page.evaluate(async (htmlContent, textContent) => {
    await navigator.clipboard.write([
        new ClipboardItem({
            'text/html': new Blob([htmlContent], { type: 'text/html' }),
            'text/plain': new Blob([textContent], { type: 'text/plain' }),
        }),
    ]);
}, html, text);

// Select all and delete
console.log('Clearing note');
await page.keyboard.down('Control');
await page.keyboard.press('a');
await page.keyboard.up('Control');
await page.keyboard.press('Delete');
await new Promise(r => setTimeout(r, 500));

// Paste from clipboard
console.log('Pasting from clipboard');
await page.keyboard.down('Control');
await page.keyboard.press('v');
await page.keyboard.up('Control');

// Wait for Obsidian to process the paste and convert HTML to markdown
await new Promise(r => setTimeout(r, 2000));

// Read the markdown content from the editor via CodeMirror 6
console.log('Reading markdown content');
const markdown = await page.evaluate(() => {
    const editor = app.workspace.activeLeaf?.view?.editor;
    if (editor) {
        return editor.getValue();
    }
    throw new Error('Could not access editor');
});

mkdirSync('tmp', { recursive: true });
writeFileSync(OUTPUT, markdown);

await browser.disconnect();
console.log(`Done: ${OUTPUT} (${markdown.length} chars)`);
