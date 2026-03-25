import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { minify } from "terser";

async function buildVariant(srcFile, label) {
  const source = readFileSync(srcFile, "utf8");
  const result = await minify(source, { compress: true, mangle: true });
  if (!result.code) {
    console.error(`Terser produced no output for ${srcFile}`);
    process.exit(1);
  }
  const bookmarklet = "javascript:" + result.code;
  console.log(`${label} minified:   ${result.code.length} chars`);
  console.log(`${label} bookmarklet: ${bookmarklet.length} chars`);
  return { code: result.code, bookmarklet };
}

mkdirSync("dist", { recursive: true });

const standard = await buildVariant("ai-transcript-copy.js", "Standard");

writeFileSync("dist/ai-transcript-copy.min.js", standard.code);
writeFileSync("dist/ai-transcript-copy.bookmarklet.txt", standard.bookmarklet);

// Generate docs/index.html from template
const template = readFileSync("docs/index.template.html", "utf8");
const href = "javascript:" + encodeURIComponent(standard.code);
const html = template.replace("{{BOOKMARKLET_HREF}}", href);
writeFileSync("docs/index.html", html);

console.log(`docs/index.html generated`);
console.log(`Build OK`);
