import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Copied from ai-transcript-copy.js line 4 (embedded in IIFE, not exportable)
const stripMarkdown = (t) => t
  .replace(/(\*\*|__)(.*?)\1/g, '$2')
  .replace(/(\*|_)(.*?)\1/g, '$2')
  .replace(/~~(.*?)~~/g, '$1')
  .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  .replace(/^#+\s+/gm, '');

describe("stripMarkdown", () => {
  it("strips bold (**)", () => {
    assert.equal(stripMarkdown("**hello**"), "hello");
  });
  it("strips bold (__)", () => {
    assert.equal(stripMarkdown("__hello__"), "hello");
  });
  it("strips italic (*)", () => {
    assert.equal(stripMarkdown("*hello*"), "hello");
  });
  it("strips italic (_)", () => {
    assert.equal(stripMarkdown("_hello_"), "hello");
  });
  it("strips strikethrough", () => {
    assert.equal(stripMarkdown("~~hello~~"), "hello");
  });
  it("strips inline code (`)", () => {
    assert.equal(stripMarkdown("`code`"), "code");
  });
  it("strips inline code (```)", () => {
    assert.equal(stripMarkdown("```code```"), "code");
  });
  it("strips links, keeps text", () => {
    assert.equal(stripMarkdown("[click here](http://example.com)"), "click here");
  });
  it("strips heading markers", () => {
    assert.equal(stripMarkdown("## Title"), "Title");
    assert.equal(stripMarkdown("### Deep heading"), "Deep heading");
  });
  it("passes through plain text unchanged", () => {
    assert.equal(stripMarkdown("hello world"), "hello world");
  });
  it("handles mixed content", () => {
    assert.equal(stripMarkdown("**bold** and *italic*"), "bold and italic");
  });
});
