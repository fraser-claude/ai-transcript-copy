const buildArtifactMap = () => {
    const map = new Map();
    const anyBlock = document.querySelector('.artifact-block-cell');
    if (!anyBlock) return map;
    const fiberKey = Object.keys(anyBlock).find(k => k.startsWith('__reactFiber'));
    if (!fiberKey) return map;
    let node = anyBlock[fiberKey];
    while (node) {
        const store = node.memoizedProps?.store;
        if (store) {
            for (const tl of (store.getState().timelines || [])) {
                for (const b of (tl.blocks || [])) {
                    if (b.type === 'tool_use' && b.name === 'create_file' && b.input?.path && b.input?.file_text) {
                        const name = b.input.path.split('/').pop();
                        const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
                        const lang = ({js:'javascript',ts:'typescript',tsx:'typescript',jsx:'javascript',py:'python',md:'markdown',sh:'bash',rb:'ruby',rs:'rust'})[ext] || ext;
                        map.set(b.input.path, { name, content: b.input.file_text, lang });
                    }
                }
            }
            break;
        }
        node = node.return;
    }
    return map;
};

const cleanElClaude = (el) => {
    const c = el.cloneNode(true);
    c.querySelectorAll('button').forEach(e => e.remove());
    // Remove code block chrome (copy buttons, language labels) — keep <pre><code>
    c.querySelectorAll('.code-block__code').forEach(pre => {
        const wrapper = pre.closest('.group\\/copy');
        if (wrapper) wrapper.replaceWith(pre);
    });
    // Strip syntax-highlighting spans from code blocks (Claude inlines colored spans)
    c.querySelectorAll('pre code').forEach(code => { code.textContent = code.innerText; });
    // Replace KaTeX math with $...$ / $$...$$ using LaTeX source from MathML annotation
    c.querySelectorAll('.katex').forEach(el => {
        const annotation = el.querySelector('annotation[encoding="application/x-tex"]');
        if (!annotation) return;
        const latex = annotation.textContent.trim();
        const isBlock = !!el.closest('.katex-display');
        const span = document.createElement('span');
        span.textContent = isBlock ? `$$${latex}$$` : `$${latex}$`;
        (el.closest('.katex-display') || el).replaceWith(span);
    });
    // Artifact replacement is handled async below
    return c;
};

const openResearchArtifact = (cell) => new Promise((resolve, reject) => {
    const process = () => {
        const md = document.querySelector('#markdown-artifact');
        const c = md.cloneNode(true);
        // Replace citation pills with [N] / [N+extra] superscripts
        const urlMap = new Map();
        let citNum = 0;
        c.querySelectorAll('span.inline-flex[data-state]').forEach(wrapper => {
            const a = wrapper.querySelector('a[href]');
            if (!a) return;
            const url = a.href;
            const plusMatch = a.innerText.match(/\+(\d+)$/);
            const extra = plusMatch ? parseInt(plusMatch[1]) : 0;
            if (!urlMap.has(url)) urlMap.set(url, ++citNum);
            const n = urlMap.get(url);
            const sup = document.createElement('sup');
            sup.textContent = extra ? `[${n}+${extra}]` : `[${n}]`;
            wrapper.replaceWith(sup);
        });
        // Strip class attributes (removes Claude's Tailwind styling)
        c.querySelectorAll('[class]').forEach(e => e.removeAttribute('class'));
        // Demote headings +2 (h1→h3, h2→h4, cap at h6)
        demoteHeadings(c, 2);
        // Append Sources section
        if (urlMap.size > 0) {
            const sh = document.createElement('h3');
            sh.textContent = 'Sources';
            const ol = document.createElement('ol');
            for (const [url] of urlMap) {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = url;
                a.textContent = url;
                li.appendChild(a);
                ol.appendChild(li);
            }
            c.appendChild(sh);
            c.appendChild(ol);
        }
        resolve({ html: c.innerHTML });
    };
    if (document.querySelector('#markdown-artifact')) { process(); return; }
    cell.click();
    const obs = new MutationObserver(() => {
        if (document.querySelector('#markdown-artifact')) { obs.disconnect(); process(); }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => reject(new Error('Timed out')), 3000);
});

const getFileThumbnailContent = (el) => {
    const fiberKey = Object.keys(el).find(k => k.startsWith('__reactFiber'));
    if (!fiberKey) return null;
    let node = el[fiberKey];
    for (let i = 0; node && i < 20; i++) {
        if (node.memoizedProps?.file?.extracted_content) return node.memoizedProps.file.extracted_content;
        node = node.return;
    }
    return null;
};

const getFileThumbnailName = (el) => el.querySelector('h3')?.textContent?.trim() || '(file)';

const copyClaudeTranscript = async (qSelector, aSelector, startIdx) => {
    startIdx = Number(startIdx);
    const rawElements = [...document.querySelectorAll(`${qSelector}, ${aSelector}`)];
    const artifactMap = buildArtifactMap();
    const htmlParts = [];

    // Pre-pass: group consecutive file-thumbnails with their following user-message (same turn)
    const turns = [];
    let i = 0;
    while (i < rawElements.length) {
        const el = rawElements[i];
        if (el.matches('[data-testid="file-thumbnail"]')) {
            const thumbs = [];
            while (i < rawElements.length && rawElements[i].matches('[data-testid="file-thumbnail"]')) {
                thumbs.push(rawElements[i++]);
            }
            if (i < rawElements.length && rawElements[i].matches("div[data-testid='user-message']")) {
                turns.push({ type: 'q', thumbs, userMsg: rawElements[i++] });
            } else {
                // Paste without a typed question — each thumbnail is its own turn
                for (const thumb of thumbs) turns.push({ type: 'q', thumbs: [thumb], userMsg: null });
            }
        } else if (el.matches(qSelector)) {
            turns.push({ type: 'q', thumbs: [], userMsg: el });
            i++;
        } else {
            turns.push({ type: 'a', el });
            i++;
        }
    }

    let qIdx = -1, aIdx = -1;
    for (const turn of turns) {
        if (turn.type === 'q') {
            qIdx++;
            if (startIdx > qIdx) continue;
            if (turn.userMsg) {
                // Turn has a typed question (possibly with pasted files attached)
                const c = cleanElClaude(turn.userMsg);
                const qTxt = stripMarkdown(c.innerText.replace(/\s+/g,' ').trim());
                const qTxtAbbr = 100 < qTxt.length ? qTxt.substring(0,100) + '...' : qTxt;
                const qEl = document.createElement('h2');
                qEl.textContent = `Q${qIdx+1}: ${qTxtAbbr}`;
                htmlParts.push(qEl.outerHTML);
                if (c.querySelector('h1,h2')) demoteHeadings(c, 1);
                htmlParts.push(`<blockquote>${c.innerHTML}</blockquote>`);
                if (turn.thumbs.length > 0) {
                    const pastedCount = turn.thumbs.filter(t => getFileThumbnailContent(t) !== null).length;
                    let pastedIdx = 0;
                    const fileNames = [];
                    for (const thumb of turn.thumbs) {
                        const content = getFileThumbnailContent(thumb);
                        if (content !== null) {
                            pastedIdx++;
                            const h3 = document.createElement('h3');
                            h3.textContent = pastedCount > 1 ? `Pasted text (${pastedIdx}):` : 'Pasted text:';
                            htmlParts.push(h3.outerHTML);
                            const pHtml = content.split(/\n\n+/).filter(s => s.trim()).map(s => {
                                const p = document.createElement('p');
                                p.textContent = s.trim();
                                return p.outerHTML;
                            }).join('');
                            htmlParts.push(`<blockquote>${pHtml}</blockquote>`);
                        } else {
                            fileNames.push(getFileThumbnailName(thumb));
                        }
                    }
                    if (fileNames.length > 0) {
                        const h3 = document.createElement('h3');
                        h3.textContent = 'Attachments';
                        htmlParts.push(h3.outerHTML);
                        const ul = document.createElement('ul');
                        for (const name of fileNames) {
                            const li = document.createElement('li');
                            li.textContent = name;
                            ul.appendChild(li);
                        }
                        htmlParts.push(ul.outerHTML);
                    }
                }
            } else {
                // Thumbnail only (no typed question) — pasted text or file attachment
                const content = getFileThumbnailContent(turn.thumbs[0]);
                if (content !== null) {
                    // Pasted text — use content as heading
                    const qTxt = stripMarkdown(content.replace(/\s+/g, ' ').trim());
                    const qTxtAbbr = 100 < qTxt.length ? qTxt.substring(0, 100) + '...' : qTxt;
                    const qEl = document.createElement('h2');
                    qEl.textContent = `Q${qIdx+1}: ${qTxtAbbr}`;
                    htmlParts.push(qEl.outerHTML);
                    const pHtml = content.split(/\n\n+/).filter(s => s.trim()).map(s => {
                        const p = document.createElement('p');
                        p.textContent = s.trim();
                        return p.outerHTML;
                    }).join('');
                    htmlParts.push(`<blockquote>${pHtml}</blockquote>`);
                } else {
                    // File attachment — use filename as heading
                    const name = getFileThumbnailName(turn.thumbs[0]);
                    const qEl = document.createElement('h2');
                    qEl.textContent = `Q${qIdx+1}: ${name}`;
                    htmlParts.push(qEl.outerHTML);
                    const h3 = document.createElement('h3');
                    h3.textContent = 'Attachments';
                    htmlParts.push(h3.outerHTML);
                    const ul = document.createElement('ul');
                    const li = document.createElement('li');
                    li.textContent = name;
                    ul.appendChild(li);
                    htmlParts.push(ul.outerHTML);
                }
            }
        } else {
            // AI response
            if (startIdx > qIdx) continue;
            aIdx++;
            const el = turn.el;
            const c = cleanElClaude(el);
            const origCells = [...el.querySelectorAll('.artifact-block-cell')];
            const cloneCells = [...c.querySelectorAll('.artifact-block-cell')];
            for (let j = 0; j < origCells.length; j++) {
                const cloneCell = cloneCells[j];
                if (!cloneCell) continue;
                const fiberKey = Object.keys(origCells[j]).find(k => k.startsWith('__reactFiber'));
                let artifact = null;
                if (fiberKey) {
                    let node = origCells[j][fiberKey];
                    while (node) {
                        const props = node.memoizedProps;
                        if (props?.properties?.id) {
                            const p = props.properties;
                            if (p.type === 'text/markdown') {
                                artifact = await openResearchArtifact(origCells[j]);
                            } else if (p.content) {
                                const atype = p.type || '';
                                artifact = { content: p.content, lang: atype.split('/').pop() || '' };
                            } else {
                                artifact = artifactMap?.get(p.id) || null;
                            }
                            break;
                        }
                        node = node.return;
                    }
                }
                if (artifact?.html !== undefined) {
                    const div = document.createElement('div');
                    div.innerHTML = artifact.html;
                    cloneCell.replaceWith(div);
                } else if (artifact) {
                    const pre = document.createElement('pre');
                    const code = document.createElement('code');
                    if (artifact.lang) code.className = 'language-' + artifact.lang;
                    code.textContent = artifact.content;
                    pre.appendChild(code);
                    cloneCell.replaceWith(pre);
                } else {
                    (cloneCell.closest('[class*="artifact-block"]') || cloneCell).remove();
                }
            }
            const aEl = document.createElement('h2');
            aEl.textContent = `A${aIdx+1}`;
            htmlParts.push(aEl.outerHTML);
            if (c.querySelector('h1,h2')) demoteHeadings(c, 1);
            htmlParts.push(c.innerHTML);
        }
    }
    await writeTranscript(htmlParts, document.title, 'claude', startIdx);
};
