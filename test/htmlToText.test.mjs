import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Copied from src/common.js (embedded in IIFE, not exportable)
const htmlToText = h => {
    const codes = [];
    return h
        .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_, c) => '\n\n\uE000' + (codes.push(c) - 1) + '\uE000\n\n')
        .replace(/<h([1-6])[^>]*>(.*?)<\/h\1>/gi, (m,n,t) => '#'.repeat(+n)+' '+t+'\n\n')
        .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
        .replace(/<a[^>]+href="([^"]*)"[^>]*>(.*?)<\/a>/gi, (m,href,txt) => txt ? '['+txt+']('+href+')' : href)
        .replace(/<hr\s*\/?>/gi, '\n---\n')
        .replace(/<tr[^>]*>([\s\S]*?)<\/tr>/gi, (m,cells) => cells.replace(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi, (_,c) => c.trim()+' | ').trimEnd().replace(/\|\s*$/, '')+'\n')
        .replace(/<\/?(?:table|thead|tbody|tfoot)[^>]*>/gi, '\n')
        .replace(/<li[^>]*>/gi, '\n- ')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<p[^>]*>/gi, '\n\n')
        .replace(/<\/?(b|strong)\b[^>]*>/gi, '**')
        .replace(/<\/?(i|em)\b[^>]*>/gi, '*')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .replace(/[ \t]*\n[ \t]*/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        .replace(/\uE000(\d+)\uE000/g, (_, i) => '```\n' + codes[+i] + '\n```');
};

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
    it("preserves code indentation", () => {
        const result = htmlToText("<pre><code>    indented\n        deeper</code></pre>");
        assert.ok(result.includes("```\n    indented\n        deeper\n```"));
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
    it("converts strong/b with attributes to **", () => {
        assert.equal(htmlToText('<strong class="foo">bold</strong>'), "**bold**");
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
    it("trims whitespace from paragraph text", () => {
        assert.equal(htmlToText("<p>  text with spaces  </p>"), "text with spaces");
    });
    it("does not strip leading whitespace after heading followed by code block", () => {
        const result = htmlToText("<h3>Title</h3><pre><code>    indented</code></pre>");
        assert.ok(result.includes("```\n    indented\n```"));
    });
    it("passes through plain text unchanged", () => {
        assert.equal(htmlToText("hello world"), "hello world");
    });
});
