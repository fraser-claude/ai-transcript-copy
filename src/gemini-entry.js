window.getSelection().removeAllRanges();
const qSelector = 'user-query .query-text';
const aSelector = 'model-response message-content';
if (!document.querySelector(qSelector)) { showToast('No questions found on this page.', 'error'); return; }
copyGeminiTranscript(qSelector, aSelector, 0)
    .then(() => showToast('Transcript copied!'))
    .catch(err => { showToast('Copy failed: ' + err.message, 'error'); console.error(err); });
