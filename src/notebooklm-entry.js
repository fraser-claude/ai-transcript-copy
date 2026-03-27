window.getSelection().removeAllRanges();
const qSelector = '.from-user-message-inner-content';
const aSelector = '.to-user-message-inner-content';
if (!document.querySelector(qSelector)) { showToast('No questions found on this page.', 'error'); return; }
copyNotebookLMTranscript(qSelector, aSelector, 0)
    .then(() => showToast('Transcript copied!'))
    .catch(err => { showToast('Copy failed. Check console.', 'error'); console.error(err); });
