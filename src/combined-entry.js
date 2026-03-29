window.getSelection().removeAllRanges();
const V = {
    'chatgpt.com':  ['chatgpt', "div[data-message-author-role='user']", "div[data-message-author-role='assistant']"],
    'gemini.google.com': ['gemini', 'user-query .query-text', 'model-response message-content'],
    'notebooklm.google.com': ['notebooklm', '.from-user-message-inner-content', '.to-user-message-inner-content'],
    'claude.ai': ['claude', "div[data-testid='user-message'], [data-testid='file-thumbnail']", '.font-claude-response']
};
const cfg = V[location.hostname];
if (!cfg) { showToast('Unsupported host: ' + location.hostname, 'error'); return; }
const [type, qSelector, aSelector] = cfg;

if (!document.querySelector(qSelector)) {
    showToast('No questions found on this page.', 'error');
    return;
}

const warning = type === 'chatgpt' && document.querySelector('iframe[title="internal://deep-research"]')
    ? 'deep research report not included' : null;

const copyFns = { chatgpt: copyChatGPTTranscript, gemini: copyGeminiTranscript, notebooklm: copyNotebookLMTranscript, claude: copyClaudeTranscript };
void copyFns[type](qSelector, aSelector, 0).then(() => {
    showToast(warning ? 'Copied. ' + warning : 'Transcript copied!', warning ? 'warning' : undefined);
}).catch(err => {
    showToast('Copy failed: ' + err.message, 'error');
    console.error(err);
});
