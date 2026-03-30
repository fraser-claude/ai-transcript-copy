#!/usr/bin/env node
// Full test pipeline: run bookmarklet, dump clipboard, verify in Google Docs and Obsidian.
// Usage: node scripts/test-bookmarklet.mjs <url> [--basic] [--force]
//
// Steps:
//   1. Run bookmarklet on <url> (opens/refreshes the tab, waits for toast)
//   2. Dump clipboard to tmp/{id}[.basic].html and tmp/{id}[.basic].md via xclip
//   3. Run verify-gdocs.mjs  → tmp/{id}[.basic]-gdocs.pdf
//   4. Run verify-obsidian.mjs → tmp/{id}[.basic]-obsidian.md

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const url = args.find(a => !a.startsWith('--'));

if (!url) {
    console.error('Usage: node scripts/test-bookmarklet.mjs <url> [--basic] [--force]');
    process.exit(1);
}

const id = new URL(url).pathname.split('/').pop();
if (!id) {
    console.error('Could not extract ID from URL');
    process.exit(1);
}

const basic = args.includes('--basic');
const force = args.includes('--force');
const suffix = basic ? '.basic' : '';

const refHtml = `reference-points/${id}${suffix}.html`;
const refText = `reference-points/${id}${suffix}.md`;
if (!force && (existsSync(refHtml) || existsSync(refText))) {
    console.error(`Reference point already exists for ${id}${suffix}.`);
    console.error(`  ${refHtml}`);
    console.error(`  ${refText}`);
    console.error('Use --force to re-run anyway.');
    process.exit(1);
}

const htmlPath = `tmp/${id}${suffix}.html`;
const textPath = `tmp/${id}${suffix}.md`;
const rawDomPath = `tmp/${id}${suffix}-raw-dom.html`;
const gdocsPath = `tmp/${id}${suffix}-gdocs.pdf`;
const obsidianPath = `tmp/${id}${suffix}-obsidian.md`;

function run(label, cmd, cmdArgs) {
    console.log(`\n=== ${label} ===`);
    execFileSync(cmd, cmdArgs, { stdio: 'inherit' });
}

mkdirSync('tmp', { recursive: true });

// Step 1: run bookmarklet
const bookmarkletArgs = ['node', join(__dirname, 'run-bookmarklet.mjs'), url, '--output', rawDomPath];
if (basic) bookmarkletArgs.push('--basic');
run('Running bookmarklet', bookmarkletArgs[0], bookmarkletArgs.slice(1));

// Step 2: dump clipboard to tmp/
console.log('\n=== Dumping clipboard ===');
const htmlContent = execFileSync('xclip', ['-selection', 'clipboard', '-target', 'text/html', '-o']);
const textContent = execFileSync('xclip', ['-selection', 'clipboard', '-target', 'text/plain', '-o']);
writeFileSync(htmlPath, htmlContent);
writeFileSync(textPath, textContent);
console.log(`${htmlPath}: ${htmlContent.length} bytes`);
console.log(`${textPath}: ${textContent.length} bytes`);

// Step 3: verify in Google Docs
run('Verifying in Google Docs', 'node', [join(__dirname, 'verify-gdocs.mjs'), '--html', htmlPath, '--text', textPath, '--output', gdocsPath]);

// Step 4: verify in Obsidian
run('Verifying in Obsidian', 'node', [join(__dirname, 'verify-obsidian.mjs'), '--html', htmlPath, '--text', textPath, '--output', obsidianPath]);

console.log('\n=== Done ===');
console.log(`  ${rawDomPath}  — page DOM snapshot`);
console.log(`  ${htmlPath}  — raw HTML clipboard output`);
console.log(`  ${textPath}  — raw plain-text clipboard output`);
console.log(`  ${gdocsPath}  — Google Docs rendering`);
console.log(`  ${obsidianPath}  — Obsidian markdown conversion`);
