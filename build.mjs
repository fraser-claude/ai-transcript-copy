import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { minify } from "terser";

const MAX_BOOKMARKLET_CHARS = 5000;

async function buildVariant(srcFile, label, sizeCheck) {
  const source = readFileSync(srcFile, "utf8");
  const result = await minify(source, { compress: true, mangle: true });
  if (!result.code) {
    console.error(`Terser produced no output for ${srcFile}`);
    process.exit(1);
  }
  const bookmarklet = "javascript:" + result.code;
  console.log(`${label} minified:   ${result.code.length} chars`);
  console.log(`${label} bookmarklet: ${bookmarklet.length} chars${sizeCheck ? ' (limit: ' + MAX_BOOKMARKLET_CHARS + ')' : ''}`);
  if (sizeCheck && bookmarklet.length > MAX_BOOKMARKLET_CHARS) {
    console.error(`\nFAIL: ${label} bookmarklet is ${bookmarklet.length} chars, exceeds ${MAX_BOOKMARKLET_CHARS} by ${bookmarklet.length - MAX_BOOKMARKLET_CHARS} chars`);
    process.exit(1);
  }
  return { code: result.code, bookmarklet };
}

mkdirSync("dist", { recursive: true });

const [standard, mobile] = await Promise.all([
  buildVariant("ai-transcript-copy.js", "Standard", false),
  buildVariant("ai-transcript-copy-mobile.js", "Mobile", true),
]);

writeFileSync("dist/ai-transcript-copy.min.js", standard.code);
writeFileSync("dist/ai-transcript-copy.bookmarklet.txt", standard.bookmarklet);
writeFileSync("dist/ai-transcript-copy-mobile.min.js", mobile.code);
writeFileSync("dist/ai-transcript-copy-mobile.bookmarklet.txt", mobile.bookmarklet);

// Generate docs/index.html from template
const template = readFileSync("docs/index.template.html", "utf8");
const href = "javascript:" + encodeURIComponent(standard.code);
const mobileHref = "javascript:" + encodeURIComponent(mobile.code);
const html = template
  .replace("{{BOOKMARKLET_HREF}}", href)
  .replace("{{BOOKMARKLET_MOBILE_HREF}}", mobileHref);
writeFileSync("docs/index.html", html);

console.log(`docs/index.html generated`);
console.log(`Build OK`);
