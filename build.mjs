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
        console.error(`ERROR: ${label} bookmarklet is ${bookmarklet.length} bytes, exceeds iOS Chrome limit of ${sizeLimit} bytes`);
        process.exit(1);
    }
    return { code: result.code, bookmarklet };
}

mkdirSync("dist", { recursive: true });

// This is approximate, and does not seem exact.
// - e.g. by truncating: `cat dist/ai-transcript-copy.bookmarklet.txt | head -c 6292`
// - 6292 byte bookmarklet synced to iOS Chrome at one point, but not another.
// - So set the limit conservatively at 6k, which appears to reliably work.
const IOS_LIMIT = 6000;

const variants = [
    { name: 'combined', label: 'Combined', parts: ['common','chatgpt','gemini','notebooklm','claude','combined-entry'], limit: null },
    { name: 'basic',    label: 'Basic',    parts: ['common','basic-combined-entry'],                                    limit: IOS_LIMIT },
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
writeFileSync("dist/basic.bookmarklet.txt", results.basic.bookmarklet);

// Generate docs/index.html from template
const template = readFileSync("docs/index.template.html", "utf8");
const html = template
    .replace("{{BOOKMARKLET_HREF}}", "javascript:" + encodeURIComponent(results.combined.code))
    .replace("{{BOOKMARKLET_HREF_BASIC}}", "javascript:" + encodeURIComponent(results.basic.code));
writeFileSync("docs/index.html", html);

console.log("docs/index.html generated");
console.log("Build OK");
