window.getSelection().removeAllRanges();
const qSelector = "div[data-testid='user-message'], [data-testid='file-thumbnail']";
const aSelector = '.font-claude-response';
if (!document.querySelector(qSelector)) { showToast('No questions found on this page.', 'error'); return; }
copyClaudeTranscript(qSelector, aSelector, 0)
    .then(() => showToast('Transcript copied!'))
    .catch(err => { showToast('Copy failed: ' + err.message, 'error'); console.error(err); });
