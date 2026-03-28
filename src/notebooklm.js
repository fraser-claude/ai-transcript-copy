const cleanElNotebookLM = (el) => {
    const c = el.cloneNode(true);
    c.querySelectorAll('button').forEach(e => e.remove());
    return c;
};

const copyNotebookLMTranscript = async (qSelector, aSelector, startIdx) => {
    startIdx = Number(startIdx);
    const elements = [...document.querySelectorAll(`${qSelector}, ${aSelector}`)];
    const htmlParts = [];
    let qIdx = -1, aIdx = -1;
    for (let i = 0; i < elements.length; i++) {
        const isQ = elements[i].matches(qSelector);
        if (isQ) qIdx++;
        const c = cleanElNotebookLM(elements[i]);
        if (startIdx <= qIdx) {
            if (isQ) {
                const qTxt = stripMarkdown(c.innerText.replace(/\s+/g,' ').trim());
                const qTxtAbbr = 100 < qTxt.length ? qTxt.substring(0,100) + '...' : qTxt;
                const qEl = document.createElement("h2");
                qEl.textContent = `Q${qIdx+1}: ${qTxtAbbr}`;
                htmlParts.push(qEl.outerHTML);
            } else {
                aIdx++;
                const aEl = document.createElement("h2");
                aEl.textContent = `A${aIdx+1}`;
                htmlParts.push(aEl.outerHTML);
            }
            if (c.querySelector('h1,h2')) demoteHeadings(c, 1);
            htmlParts.push(isQ ? `<blockquote>${c.innerHTML}</blockquote>` : c.innerHTML);
        }
    }
    await writeTranscript(htmlParts, document.title, 'notebooklm', startIdx);
};
