import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Copied from ai-transcript-copy.js (embedded in IIFE, not exportable)
const htmlToText = h => h
    .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n')
    .replace(/<h([1-6])[^>]*>(.*?)<\/h\1>/gi, (m,n,t) => '#'.repeat(+n)+' '+t+'\n\n')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/?(?:b|strong)>/gi, '**')
    .replace(/<\/?(?:i|em)>/gi, '*')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

describe("htmlToText", () => {
    it("converts h1 to # heading", () => {
        assert.equal(htmlToText("<h1>Title</h1>"), "# Title");
    });
    it("converts h2 to ## heading", () => {
        assert.equal(htmlToText("<h2>Section</h2>"), "## Section");
    });
    it("converts h3..h6", () => {
        assert.equal(htmlToText("<h3>Sub</h3>"), "### Sub");
        assert.equal(htmlToText("<h6>Deep</h6>"), "###### Deep");
    });
    it("converts pre/code to fenced code block", () => {
        const result = htmlToText("<pre><code>const x = 1;</code></pre>");
        assert.ok(result.includes("```"));
        assert.ok(result.includes("const x = 1;"));
    });
    it("handles pre/code with attributes", () => {
        const result = htmlToText('<pre class="foo"><code class="language-js">let y = 2;</code></pre>');
        assert.ok(result.includes("```\nlet y = 2;\n```"));
    });
    it("converts inline code to backticks", () => {
        assert.equal(htmlToText("<code>foo</code>"), "`foo`");
    });
    it("converts li to bullet list", () => {
        const result = htmlToText("<ul><li>item one</li><li>item two</li></ul>");
        assert.ok(result.includes("- item one"));
        assert.ok(result.includes("- item two"));
    });
    it("converts br to newline", () => {
        const result = htmlToText("line one<br>line two");
        assert.ok(result.includes("line one\nline two"));
    });
    it("converts </p> to double newline", () => {
        const result = htmlToText("<p>para one</p><p>para two</p>");
        assert.ok(result.includes("para one\n\npara two"));
    });
    it("converts strong/b to **", () => {
        assert.equal(htmlToText("<strong>bold</strong>"), "**bold**");
        assert.equal(htmlToText("<b>bold</b>"), "**bold**");
    });
    it("converts em/i to *", () => {
        assert.equal(htmlToText("<em>italic</em>"), "*italic*");
        assert.equal(htmlToText("<i>italic</i>"), "*italic*");
    });
    it("strips unknown tags", () => {
        assert.equal(htmlToText("<div><span>hello</span></div>"), "hello");
    });
    it("decodes HTML entities", () => {
        assert.equal(htmlToText("a &amp; b"), "a & b");
        assert.equal(htmlToText("&lt;tag&gt;"), "<tag>");
    });
    it("collapses excessive newlines", () => {
        const result = htmlToText("<p>a</p><p>b</p><p>c</p>");
        assert.ok(!result.includes("\n\n\n"));
    });
    it("passes through plain text unchanged", () => {
        assert.equal(htmlToText("hello world"), "hello world");
    });
});
