const cleanElGemini = (el) => {
    const origCodes = el.querySelectorAll('pre code');
    const c = el.cloneNode(true);
    c.querySelectorAll('pre code').forEach((cloneCode, i) => {
        if (origCodes[i]) cloneCode.textContent = origCodes[i].innerText;
    });
    c.querySelectorAll('button img').forEach(img => img.closest('button').replaceWith(img));
    c.querySelectorAll('button').forEach(e => e.remove());
    // Preserve language label before removing decoration
    c.querySelectorAll('code-block').forEach(cb => {
        const deco = cb.querySelector('.code-block-decoration');
        const lang = deco?.textContent?.trim().toLowerCase();
        if (lang) {
            const code = cb.querySelector('code');
            if (code && !code.className) code.className = 'language-' + lang;
        }
    });
    // Extract research plan content from confirmation widget before removing [hide-from-message-actions] chrome
    c.querySelectorAll('deep-research-confirmation-widget').forEach(widget => {
        const plan = widget.querySelector('[hide-from-message-actions]');
        if (plan) { plan.removeAttribute('hide-from-message-actions'); widget.replaceWith(plan); }
        else widget.remove();
    });
    c.querySelectorAll('code-block div.code-block-decoration, .cdk-visually-hidden, p.query-text-line br, source-footnote, sources-carousel-inline, source-inline-chip, overview-carousel, [hide-from-message-actions]').forEach(e => e.remove());
    c.querySelectorAll('[data-math]').forEach(e => { const tex = e.getAttribute('data-math'); e.textContent = e.tagName === 'DIV' ? '$$' + tex + '$$' : '$' + tex + '$'; });
    c.querySelectorAll('li').forEach(e => e.innerText = e.innerText); // eslint-disable-line no-self-assign
    return c;
};

const openGeminiResearchReport = (el) => new Promise((resolve, reject) => {
    const process = () => {
        const panel = document.querySelector('deep-research-immersive-panel');
        const md = panel.querySelector('.markdown.markdown-main-panel');
        const c = md.cloneNode(true);
        // Replace source-footnotes with [N] superscripts
        c.querySelectorAll('source-footnote').forEach(fn => {
            const idx = fn.querySelector('sup[data-turn-source-index]')?.getAttribute('data-turn-source-index');
            const sup = document.createElement('sup');
            if (idx) { sup.textContent = `[${idx}]`; fn.replaceWith(sup); }
            else fn.remove();
        });
        // Remove carousel chrome and UI chrome (e.g. "Export to Sheets")
        c.querySelectorAll('sources-carousel-inline, source-inline-chip, overview-carousel, [hide-from-message-actions]').forEach(e => e.remove());
        // Replace rendered math with LaTeX source text
        c.querySelectorAll('[data-math]').forEach(e => { const tex = e.getAttribute('data-math'); e.textContent = e.tagName === 'DIV' ? '$$' + tex + '$$' : '$' + tex + '$'; });
        // Demote headings +2 (h1→h3, h2→h4, cap at h6)
        demoteHeadings(c, 2);
        // Build Sources section (position N in list = citation index N)
        const seen = new Set();
        const sourceLinks = [...panel.querySelectorAll('div.source-list.used-sources browse-web-item a[href]')]
            .map(a => a.href).filter(url => !seen.has(url) && seen.add(url));
        if (sourceLinks.length > 0) {
            const sh = document.createElement('h3');
            sh.textContent = 'Sources';
            const ol = document.createElement('ol');
            for (const url of sourceLinks) {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = url; a.textContent = url;
                li.appendChild(a); ol.appendChild(li);
            }
            c.appendChild(sh); c.appendChild(ol);
        }
        resolve(c);
    };
    if (document.querySelector('deep-research-immersive-panel .markdown.markdown-main-panel')) { process(); return; }
    const chipContent = el.querySelector('deep-research-entry-chip-content')
        || document.querySelector('deep-research-entry-chip-content');
    chipContent?.click();
    const obs = new MutationObserver(() => {
        if (document.querySelector('deep-research-immersive-panel .markdown.markdown-main-panel')) {
            obs.disconnect(); process();
        }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => reject(new Error('Timed out')), 3000);
});

const copyGeminiTranscript = async (qSelector, aSelector, startIdx) => {
    startIdx = Number(startIdx);
    const elements = [...document.querySelectorAll(`${qSelector}, ${aSelector}`)];
    const htmlParts = [];
    let qIdx = -1, aIdx = -1;
    for (let i = 0; i < elements.length; i++) {
        const isQ = elements[i].matches(qSelector);
        if (isQ) qIdx++;
        const c = cleanElGemini(elements[i]);
        const cloneChip = c.querySelector('immersive-entry-chip');
        if (cloneChip && elements[i].querySelector('deep-research-entry-chip-content')) {
            const result = await openGeminiResearchReport(elements[i]);
            cloneChip.replaceWith(result);
        }
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
    const codePanel = document.querySelector('code-immersive-panel');
    if (codePanel) {
        const canvasTitle = codePanel.querySelector('toolbar')?.innerText?.trim().split('\n')[0] || 'Canvas';
        const canvasContent = window.monaco?.editor?.getModels?.()?.[0]?.getValue?.()
            || codePanel.querySelector('textarea')?.value || '';
        if (canvasContent) {
            aIdx++;
            const aEl = document.createElement("h2");
            aEl.textContent = `A${aIdx+1}: Canvas \u2014 ${canvasTitle}`;
            const pre = document.createElement('pre');
            const code = document.createElement('code');
            code.textContent = canvasContent;
            pre.appendChild(code);
            htmlParts.push(aEl.outerHTML);
            htmlParts.push(pre.outerHTML);
        }
    }
    const title = document.querySelector("span[data-test-id='conversation-title']")?.innerText || 'Gemini';
    await writeTranscript(htmlParts, title, 'gemini', startIdx);
};
