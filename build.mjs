import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { minify } from "terser";

function srcParts(...names) {
    return names.map(n => readFileSync(`src/${n}.js`, "utf8")).join('\n');
}

async function buildVariant(source, label, sizeLimit) {
    const result = await minify(source, { compress: { passes: 3 }, mangle: true });
    if (!result.code) {
        console.error(`Terser produced no output for ${label}`);
        process.exit(1);
    }
    // iOS Chrome cannot have `%` in the bookmarklet even though it's a valid character.
    // - If it does, the bookmarklet does nothing. Function does not execute at all.
    // - So: escape it.
    const bookmarklet = "javascript:" + result.code.replace(/%/g, '%25');
    console.log(`${label} minified:    ${result.code.length} chars`);
    console.log(`${label} bookmarklet: ${bookmarklet.length} chars`);
    if (sizeLimit && bookmarklet.length > sizeLimit) {
        console.error(`ERROR: ${label} bookmarklet is ${bookmarklet.length} bytes, exceeds Chrome sync limit of ${sizeLimit} bytes`);
        process.exit(1);
    }
    return { code: result.code, bookmarklet };
}

mkdirSync("dist", { recursive: true });

// Chrome's bookmark sync service silently drops bookmarks larger than ~6 KB.
// This only affects bookmarks synced via Chrome — manually created bookmarks
// on iOS Chrome or iOS Safari have no such limit.
// The threshold is approximate: a 6292-byte bookmarklet synced at one point but
// not another, so set the limit conservatively at 6k to reliably work.
const CHROME_SYNC_LIMIT = 6000;

const variants = [
    { name: 'combined', label: 'Combined', parts: ['common','chatgpt','gemini','notebooklm','claude','combined-entry'], limit: null },
    { name: 'basic',    label: 'Basic',    parts: ['common','basic-combined-entry'],                                    limit: CHROME_SYNC_LIMIT },
];

const results = {};
for (const v of variants) {
    const source = `(()=>{\n${srcParts(...v.parts)}\n})();`;
    results[v.name] = { source, ...await buildVariant(source, v.label, v.limit) };
}

writeFileSync("dist/ai-transcript-copy.js", results.combined.source);
writeFileSync("dist/ai-transcript-copy.min.js", results.combined.code);
writeFileSync("dist/ai-transcript-copy.bookmarklet.txt", results.combined.bookmarklet);
writeFileSync("dist/basic.js", results.basic.source);
writeFileSync("dist/basic.min.js", results.basic.code);
writeFileSync("dist/basic.bookmarklet.txt", results.basic.bookmarklet);

// Generate docs/index.html from template
const template = readFileSync("docs/index.template.html", "utf8");
const html = template
    .replace("{{BOOKMARKLET_HREF}}", "javascript:" + encodeURIComponent(results.combined.code))
    .replace("{{BOOKMARKLET_HREF_BASIC}}", "javascript:" + encodeURIComponent(results.basic.code));
writeFileSync("docs/index.html", html);

console.log("docs/index.html generated");
console.log("Build OK");
