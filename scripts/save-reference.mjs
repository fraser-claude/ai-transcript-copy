#!/usr/bin/env node
// Save current tmp output as an approved reference point.
// Usage: node scripts/save-reference.mjs <url-or-id> [--basic]

import { copyFileSync, existsSync, mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
const useBasic = args.includes('--basic');
const input = args.find(a => !a.startsWith('--'));

if (!input) {
    console.error('Usage: node scripts/save-reference.mjs <url-or-id> [--basic]');
    process.exit(1);
}

const id = input.startsWith('http') ? new URL(input).pathname.split('/').pop() : input;
const variant = useBasic ? `${id}.basic` : id;

const htmlSrc = `tmp/${variant}.html`;
const mdSrc = `tmp/${variant}.md`;

for (const f of [htmlSrc, mdSrc]) {
    if (!existsSync(f)) {
        console.error(`Not found: ${f} — run the test pipeline first`);
        process.exit(1);
    }
}

mkdirSync('reference-points', { recursive: true });
copyFileSync(htmlSrc, `reference-points/${variant}.html`);
copyFileSync(mdSrc, `reference-points/${variant}.md`);

console.log(`Saved reference point for ${variant}:`);
console.log(`  reference-points/${variant}.html`);
console.log(`  reference-points/${variant}.md`);
