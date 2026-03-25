import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { minify } from "terser";

const MAX_BOOKMARKLET_CHARS = 5000;

const source = readFileSync("ai-transcript-copy.js", "utf8");

const result = await minify(source, {
  compress: true,
  mangle: true,
});

if (!result.code) {
  console.error("Terser produced no output");
  process.exit(1);
}

const bookmarklet = "javascript:" + result.code;
const minifiedLen = result.code.length;
const bookmarkletLen = bookmarklet.length;

console.log(`Minified:   ${minifiedLen} chars`);
console.log(`Bookmarklet (with javascript: prefix): ${bookmarkletLen} chars (limit: ${MAX_BOOKMARKLET_CHARS})`);

if (bookmarkletLen > MAX_BOOKMARKLET_CHARS) {
  console.error(`\nFAIL: Bookmarklet is ${bookmarkletLen} chars, exceeds ${MAX_BOOKMARKLET_CHARS} limit by ${bookmarkletLen - MAX_BOOKMARKLET_CHARS} chars`);
  process.exit(1);
}

mkdirSync("dist", { recursive: true });
writeFileSync("dist/ai-transcript-copy.min.js", result.code);
writeFileSync("dist/ai-transcript-copy.bookmarklet.txt", bookmarklet);

// Generate docs/index.html from template
const template = readFileSync("docs/index.template.html", "utf8");
const href = "javascript:" + encodeURIComponent(result.code);
const html = template.replace("{{BOOKMARKLET_HREF}}", href);
writeFileSync("docs/index.html", html);

console.log(`docs/index.html generated`);
console.log(`Build OK`);
