window.getSelection().removeAllRanges();
const qSelector = "div[data-message-author-role='user']";
const aSelector = "div[data-message-author-role='assistant']";
if (!document.querySelector(qSelector)) { showToast('No questions found on this page.', 'error'); return; }
const warning = document.querySelector('iframe[title="internal://deep-research"]') ? 'deep research report not included' : null;
copyChatGPTTranscript(qSelector, aSelector, 0).then(() => {
    showToast(warning ? 'Copied. ' + warning : 'Transcript copied!', warning ? 'warning' : undefined);
}).catch(err => { showToast('Copy failed. Check console.', 'error'); console.error(err); });
