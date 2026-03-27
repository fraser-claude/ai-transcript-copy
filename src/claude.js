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

const copyClaudeTranscript = async (qSelector, aSelector, startIdx) => {
    startIdx = Number(startIdx);
    const elements = [...document.querySelectorAll(`${qSelector}, ${aSelector}`)];
    const artifactMap = buildArtifactMap();
    const htmlParts = [];
    let qIdx = -1, aIdx = -1;
    for (let i = 0; i < elements.length; i++) {
        const isQ = elements[i].matches(qSelector);
        if (isQ) qIdx++;
        const c = cleanElClaude(elements[i]);
        const origCells = [...elements[i].querySelectorAll('.artifact-block-cell')];
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
            htmlParts.push(c.innerHTML);
        }
    }
    await writeTranscript(htmlParts, document.title, 'claude', startIdx);
};
