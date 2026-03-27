window.getSelection().removeAllRanges();
const V = {
    'chatgpt.com':           ['chatgpt',    "div[data-message-author-role='user']", "div[data-message-author-role='assistant']"],
    'gemini.google.com':     ['gemini',     'user-query .query-text',               'model-response message-content'],
    'notebooklm.google.com': ['notebooklm', '.from-user-message-inner-content',     '.to-user-message-inner-content'],
    'claude.ai':             ['claude',     "div[data-testid='user-message']",       '.font-claude-response'],
};
const cfg = V[location.hostname];
if (!cfg) { showToast('Unsupported host: ' + location.hostname, 'error'); return; }
const [vendor, qSelector, aSelector] = cfg;

if (!document.querySelector(qSelector)) {
    showToast('No questions found on this page.', 'error');
    return;
}

const elements = [...document.querySelectorAll(`${qSelector}, ${aSelector}`)];
const htmlParts = [];
let qIdx = -1, aIdx = -1;
for (const el of elements) {
    const isQ = el.matches(qSelector);
    if (isQ) qIdx++;
    const c = el.cloneNode(true);
    c.querySelectorAll('button').forEach(e => e.remove());
    if (isQ) {
        const qTxt = stripMarkdown(c.innerText.replace(/\s+/g, ' ').trim());
        const qTxtAbbr = 100 < qTxt.length ? qTxt.substring(0, 100) + '...' : qTxt;
        const qEl = document.createElement('h2');
        qEl.textContent = `Q${qIdx + 1}: ${qTxtAbbr}`;
        htmlParts.push(qEl.outerHTML);
    } else {
        aIdx++;
        const aEl = document.createElement('h2');
        aEl.textContent = `A${aIdx + 1}`;
        htmlParts.push(aEl.outerHTML);
    }
    if (c.querySelector('h1,h2')) demoteHeadings(c, 1);
    htmlParts.push(c.innerHTML);
}
const title = document.querySelector("span[data-test-id='conversation-title']")?.innerText || document.title;
void writeTranscript(htmlParts, title, vendor, 0).then(() => {
    showToast('Basic transcript copied!');
}).catch(err => {
    showToast('Copy failed. Check console.', 'error');
    console.error(err);
});
