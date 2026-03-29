#!/usr/bin/env node
// Paste tmp/sample.html into the test Google Doc and export to PDF.
// Usage: node scripts/verify-gdocs.mjs
//
// Reads tmp/sample.html and tmp/sample.md, writes them to the clipboard,
// then clears the test doc, pastes, and saves tmp/verify-gdocs.pdf.

import puppeteer from 'puppeteer-core';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const GDOCS_URL = 'https://docs.google.com/document/d/1Irr9gUG3CTOZ10oD_ad5I-Ei4PFsiM8RJ5unUIcMQAg/edit?pli=1&tab=t.0';
const OUTPUT = 'tmp/verify-gdocs.pdf';

const html = readFileSync('tmp/sample.html', 'utf8');
const text = readFileSync('tmp/sample.md', 'utf8');

let browser;
try {
    browser = await puppeteer.connect({ browserURL: 'http://localhost:9223' });
} catch {
    console.error('Cannot connect to Chromium on localhost:9223.');
    console.error('Is Chromium running with --remote-debugging-port=9223?');
    process.exit(1);
}

const pages = await browser.pages();
const existing = pages.find(p => p.url().startsWith('https://docs.google.com/document/d/1Irr9gUG3CTOZ10oD_ad5I-Ei4PFsiM8RJ5unUIcMQAg'));

let page;
if (existing) {
    console.log('Refreshing existing Google Docs tab');
    page = existing;
    await page.bringToFront();
    await page.reload({ waitUntil: 'networkidle2' });
} else {
    console.log('Opening Google Docs tab');
    page = await browser.newPage();
    await page.goto(GDOCS_URL, { waitUntil: 'networkidle2' });
    await page.bringToFront();
}

const client = await page.createCDPSession();
await client.send('Browser.grantPermissions', {
    origin: 'https://docs.google.com',
    permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
});

// Write sample files to clipboard
console.log('Setting clipboard from tmp/sample.html and tmp/sample.md');
await page.evaluate(async (htmlContent, textContent) => {
    await navigator.clipboard.write([
        new ClipboardItem({
            'text/html': new Blob([htmlContent], { type: 'text/html' }),
            'text/plain': new Blob([textContent], { type: 'text/plain' }),
        }),
    ]);
}, html, text);

// Select all and delete existing content
console.log('Clearing document');
await page.keyboard.down('Control');
await page.keyboard.press('a');
await page.keyboard.up('Control');
await page.keyboard.press('Delete');

// Small pause to let Google Docs process the deletion
await new Promise(r => setTimeout(r, 1000));

// Paste from clipboard
console.log('Pasting from clipboard');
await page.keyboard.down('Control');
await page.keyboard.press('v');
await page.keyboard.up('Control');

// Wait for Google Docs to finish rendering the pasted content
console.log('Waiting for render');
await new Promise(r => setTimeout(r, 4000));

// Export to PDF via CDP directly to avoid page.pdf() resizing the window as a side effect
console.log(`Saving PDF to ${OUTPUT}`);
mkdirSync('tmp', { recursive: true });
const { data } = await client.send('Page.printToPDF', {
    printBackground: true,
    paperWidth: 8.27,   // A4 in inches
    paperHeight: 11.69,
});
writeFileSync(OUTPUT, Buffer.from(data, 'base64'));

await browser.disconnect();
console.log(`Done: ${OUTPUT}`);
