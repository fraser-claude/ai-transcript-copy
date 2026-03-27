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
    const bookmarklet = "javascript:" + result.code;
    console.log(`${label} minified:    ${result.code.length} chars`);
    console.log(`${label} bookmarklet: ${bookmarklet.length} chars`);
    if (sizeLimit && bookmarklet.length > sizeLimit) {
        console.error(`ERROR: ${label} bookmarklet is ${bookmarklet.length} bytes, exceeds iOS Chrome limit of ${sizeLimit} bytes`);
        process.exit(1);
    }
    return { code: result.code, bookmarklet };
}

mkdirSync("dist", { recursive: true });

const IOS_LIMIT = 6962;

const variants = [
    { name: 'combined',   label: 'Combined',   parts: ['common','chatgpt','gemini','notebooklm','claude','combined-entry'], limit: null },
    { name: 'chatgpt',    label: 'ChatGPT',    parts: ['common','chatgpt','chatgpt-entry'],         limit: IOS_LIMIT },
    { name: 'gemini',     label: 'Gemini',     parts: ['common','gemini','gemini-entry'],           limit: IOS_LIMIT },
    { name: 'claude',     label: 'Claude',     parts: ['common','claude','claude-entry'],           limit: IOS_LIMIT },
    { name: 'notebooklm', label: 'NotebookLM', parts: ['common','notebooklm','notebooklm-entry'],  limit: IOS_LIMIT },
];

const results = {};
for (const v of variants) {
    const source = `(()=>{\n${srcParts(...v.parts)}\n})();`;
    results[v.name] = await buildVariant(source, v.label, v.limit);
}

writeFileSync("dist/ai-transcript-copy.min.js", results.combined.code);
writeFileSync("dist/ai-transcript-copy.bookmarklet.txt", results.combined.bookmarklet);
for (const name of ['chatgpt', 'gemini', 'claude', 'notebooklm']) {
    writeFileSync(`dist/${name}.bookmarklet.txt`, results[name].bookmarklet);
}

// Generate docs/index.html from template
const template = readFileSync("docs/index.template.html", "utf8");
const html = template
    .replace("{{BOOKMARKLET_HREF}}", "javascript:" + encodeURIComponent(results.combined.code))
    .replace("{{BOOKMARKLET_HREF_CHATGPT}}", "javascript:" + encodeURIComponent(results.chatgpt.code))
    .replace("{{BOOKMARKLET_HREF_GEMINI}}", "javascript:" + encodeURIComponent(results.gemini.code))
    .replace("{{BOOKMARKLET_HREF_CLAUDE}}", "javascript:" + encodeURIComponent(results.claude.code))
    .replace("{{BOOKMARKLET_HREF_NOTEBOOKLM}}", "javascript:" + encodeURIComponent(results.notebooklm.code));
writeFileSync("docs/index.html", html);

console.log("docs/index.html generated");
console.log("Build OK");
