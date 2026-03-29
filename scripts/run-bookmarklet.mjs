#!/usr/bin/env node
// Run the bookmarklet on a specific Chromium tab.
// Usage: node scripts/run-bookmarklet.mjs <url> [--basic]
//
// Connects to Chromium on localhost:9223 (must be running with --remote-debugging-port=9223).
// If a tab with the given URL is already open, refreshes it and runs the bookmarklet.
// If not, opens the URL in a new tab. Grants clipboard permissions and waits for the toast.

import puppeteer from 'puppeteer-core';
import { readFileSync, existsSync } from 'node:fs';

const args = process.argv.slice(2);
const useBasic = args.includes('--basic');
const url = args.find(a => !a.startsWith('--'));

if (!url) {
    console.error('Usage: node scripts/run-bookmarklet.mjs <url> [--basic]');
    console.error('  url      exact URL to open or refresh');
    console.error('  --basic  use dist/basic.min.js instead of dist/ai-transcript-copy.min.js');
    process.exit(1);
}

const distFile = useBasic ? 'dist/basic.min.js' : 'dist/ai-transcript-copy.min.js';
if (!existsSync(distFile)) {
    console.error(`${distFile} not found. Run 'pnpm run build' first.`);
    process.exit(1);
}
const scriptSource = readFileSync(distFile, 'utf8');

let browser;
try {
    browser = await puppeteer.connect({ browserURL: 'http://localhost:9223', defaultViewport: null });
} catch {
    console.error('Cannot connect to Chromium on localhost:9223.');
    console.error('Is Chromium running with --remote-debugging-port=9223?');
    process.exit(1);
}

const pages = await browser.pages();
const existing = pages.find(p => p.url() === url);

let page;
if (existing) {
    console.log(`Refreshing existing tab: ${url}`);
    page = existing;
    await page.bringToFront();
    await page.reload({ waitUntil: 'networkidle2' });
} else {
    console.log(`Opening new tab: ${url}`);
    page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });
    await page.bringToFront();
}

const client = await page.createCDPSession();
await client.send('Browser.grantPermissions', {
    origin: new URL(page.url()).origin,
    permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
});

console.log(`Running ${distFile}`);

const result = await page.evaluate(async (src) => {
    if (!document.hasFocus()) {
        return { success: false, message: 'Page does not have focus after bringToFront' };
    }

    const toastPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Toast timeout after 15s')), 15000);
        const existing = document.getElementById('fen-EA8C8B95-toast');
        if (existing) {
            clearTimeout(timeout);
            resolve(existing.textContent);
            return;
        }
        const observer = new MutationObserver(() => {
            const toast = document.getElementById('fen-EA8C8B95-toast');
            if (toast) {
                observer.disconnect();
                clearTimeout(timeout);
                resolve(toast.textContent);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    });

    eval(src); // eslint-disable-line no-eval

    const message = await toastPromise;
    return { success: !message.toLowerCase().includes('failed'), message };
}, scriptSource);

await browser.disconnect();

console.log(result.message);
process.exit(result.success ? 0 : 1);
