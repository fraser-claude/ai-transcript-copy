#!/usr/bin/env node
// Full test pipeline: run bookmarklet, dump clipboard, verify in Google Docs and Obsidian.
// Usage: node scripts/test-bookmarklet.mjs <url> [--basic]
//
// Steps:
//   1. Run bookmarklet on <url> (opens/refreshes the tab, waits for toast)
//   2. Dump clipboard to tmp/sample.html and tmp/sample.md via xclip
//   3. Run verify-gdocs.mjs  → tmp/verify-gdocs.pdf
//   4. Run verify-obsidian.mjs → tmp/verify-obsidian.md

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const url = args.find(a => !a.startsWith('--'));

if (!url) {
    console.error('Usage: node scripts/test-bookmarklet.mjs <url> [--basic]');
    process.exit(1);
}

function run(label, cmd, cmdArgs) {
    console.log(`\n=== ${label} ===`);
    execFileSync(cmd, cmdArgs, { stdio: 'inherit' });
}

mkdirSync('tmp', { recursive: true });

// Step 1: run bookmarklet
const bookmarkletArgs = ['node', join(__dirname, 'run-bookmarklet.mjs'), url];
if (args.includes('--basic')) bookmarkletArgs.push('--basic');
run('Running bookmarklet', bookmarkletArgs[0], bookmarkletArgs.slice(1));

// Step 2: dump clipboard to tmp/
console.log('\n=== Dumping clipboard ===');
const htmlContent = execFileSync('xclip', ['-selection', 'clipboard', '-target', 'text/html', '-o']);
const textContent = execFileSync('xclip', ['-selection', 'clipboard', '-target', 'text/plain', '-o']);
writeFileSync('tmp/sample.html', htmlContent);
writeFileSync('tmp/sample.md', textContent);
console.log(`tmp/sample.html: ${htmlContent.length} bytes`);
console.log(`tmp/sample.md:   ${textContent.length} bytes`);

// Step 3: verify in Google Docs
run('Verifying in Google Docs', 'node', [join(__dirname, 'verify-gdocs.mjs')]);

// Step 4: verify in Obsidian
run('Verifying in Obsidian', 'node', [join(__dirname, 'verify-obsidian.mjs')]);

console.log('\n=== Done ===');
console.log('  tmp/sample.html       — raw HTML clipboard output');
console.log('  tmp/sample.md         — raw plain-text clipboard output');
console.log('  tmp/verify-gdocs.pdf  — Google Docs rendering');
console.log('  tmp/verify-obsidian.md — Obsidian markdown conversion');
