(()=> {
    const id = 'fen-EA8C8B95';

    const showToast = (msg, type) => {
        // type: 'error' (red), 'warning' (amber), default (green)
        const tid = id + '-toast';
        const existing = document.getElementById(tid);
        if (existing) existing.remove();
        const t = document.createElement('div');
        t.id = tid;
        t.textContent = msg;
        const bg = type === 'error' ? '#b00' : type === 'warning' ? '#a06000' : '#2a7f2a';
        t.style.cssText = `position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:2147483647;padding:10px 16px;border-radius:6px;font:14px sans-serif;color:#fff;background:${bg};box-shadow:0 2px 8px rgba(0,0,0,.3);transition:opacity .4s`;
        document.body.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 2500);
    };

    const stripMarkdown = (t) => t.replace(/(\*\*|__)(.*?)\1/g, '$2').replace(/(\*|_)(.*?)\1/g, '$2').replace(/~~(.*?)~~/g, '$1').replace(/`{1,3}(.*?)`{1,3}/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/^#+\s+/gm, '');

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
                            const extLang = { js:'javascript', ts:'typescript', tsx:'typescript', jsx:'javascript', html:'html', css:'css', py:'python', json:'json', md:'markdown', sh:'bash', rb:'ruby', java:'java', go:'go', rs:'rust', cpp:'cpp', cc:'cpp', c:'c' };
                            map.set(b.input.path, { name, content: b.input.file_text, lang: extLang[ext] || ext });
                        }
                    }
                }
                break;
            }
            node = node.return;
        }
        return map;
    };

    const cleanEl = (el, type) => {
        const c = el.cloneNode(true);
        c.querySelectorAll('button').forEach(e => e.remove());
        if (type == 'chatgpt') {
            const oP = el.querySelectorAll('#code-block-viewer');
            c.querySelectorAll('#code-block-viewer').forEach((e, i) => {
                // Get language from the first .items-center in the original pre
                const langText = oP[i]?.closest('pre')?.querySelector('.items-center')?.textContent || '';
                const lang = langText.replace(/run$/i, '').replace(/\s+/g, '').toLowerCase();
                const p = document.createElement('pre');
                const cd = document.createElement('code');
                if (lang) cd.className = 'language-' + lang;
                cd.textContent = oP[i].innerText;
                p.appendChild(cd);
                e.closest('pre').replaceWith(p);
            });
        } else if (type == 'gemini') {
            // Preserve language label before removing decoration
            c.querySelectorAll('code-block').forEach(cb => {
                const deco = cb.querySelector('.code-block-decoration');
                const lang = deco?.textContent?.trim().toLowerCase();
                if (lang) {
                    const code = cb.querySelector('code');
                    if (code && !code.className) code.className = 'language-' + lang;
                }
            });
            c.querySelectorAll('code-block div.code-block-decoration, .cdk-visually-hidden, p.query-text-line br, source-footnote, sources-carousel-inline, source-inline-chip, overview-carousel').forEach(e => e.remove());
            c.querySelectorAll('li').forEach(e => e.innerText = e.innerText); // eslint-disable-line no-self-assign
        } else if (type == 'claude') {
            // Remove code block chrome (copy buttons, language labels) — keep <pre><code>
            c.querySelectorAll('.code-block__code').forEach(pre => {
                const wrapper = pre.closest('.group\\/copy');
                if (wrapper) wrapper.replaceWith(pre);
            });
            // Artifact replacement is handled async in copyTranscriptFrom
        }
        return c;
    };

    window.getSelection().removeAllRanges();
    const V = {
        'chatgpt.com':  ['chatgpt', "div[data-message-author-role='user']", "div[data-message-author-role='assistant']"],
        'gemini.google.com': ['gemini', 'user-query .query-text', 'model-response message-content'],
        'notebooklm.google.com': ['notebooklm', '.from-user-message-inner-content', '.to-user-message-inner-content'],
        'claude.ai': ['claude', "div[data-testid='user-message']", '.font-claude-response']
    };
    const cfg = V[location.hostname];
    if (!cfg) { showToast('❌ Unsupported host: ' + location.hostname, 'error'); return; }
    const [type, qSelector, aSelector] = cfg;

    const htmlToText = h => h
        .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n')
        .replace(/<h([1-6])[^>]*>(.*?)<\/h\1>/gi, (m,n,t) => '#'.repeat(+n)+' '+t+'\n\n')
        .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
        .replace(/<a[^>]+href="([^"]*)"[^>]*>(.*?)<\/a>/gi, (m,href,txt) => txt ? '['+txt+']('+href+')' : href)
        .replace(/<hr\s*\/?>/gi, '\n---\n')
        .replace(/<tr[^>]*>([\s\S]*?)<\/tr>/gi, (m,cells) => cells.replace(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi, (_,c) => c.trim()+' | ').trimEnd().replace(/\|\s*$/, '')+'\n')
        .replace(/<\/?(?:table|thead|tbody|tfoot)[^>]*>/gi, '\n')
        .replace(/<li[^>]*>/gi, '\n- ')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/?(?:b|strong)>/gi, '**')
        .replace(/<\/?(?:i|em)>/gi, '*')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    const getModel = (type) => {
        if (type === 'gemini') {
            const btn = document.querySelector('[data-test-id="bard-mode-menu-button"]');
            btn?.click();
            const title = document.querySelector('[data-test-id="bard-mode-menu-title"]')?.innerText?.trim() || 'Gemini';
            const selected = document.querySelector('.bard-mode-list-button.is-selected');
            const modeName = selected?.querySelector('.mode-title')?.innerText?.trim() || '';
            const modeDesc = selected?.querySelector('.mode-desc')?.innerText?.trim() || '';
            btn?.click();
            const proMatch = modeDesc.match(/(\d+\.\d+ Pro)/);
            if (proMatch) return `Gemini ${proMatch[1]}`;
            return modeName ? `${title} ${modeName}` : title;
        }
        const selectors = {
            chatgpt: ['[data-message-model-slug]',
                      'button[data-testid="model-switcher-dropdown-button"]'],
            claude:  ['button[data-testid="model-selector-dropdown"]'],
            notebooklm: [],
        }[type] || [];
        const fallback = { chatgpt:'ChatGPT', claude:'Claude', notebooklm:'NotebookLM' }[type] || type;
        for (const s of selectors) {
            const el = document.querySelector(s);
            const text = (el?.dataset?.messageModelSlug || el?.textContent)?.trim();
            if (text) return text;
        }
        return fallback;
    };

    const getFirstResponseDate = (aSelector) => {
        const firstResp = document.querySelector(aSelector);
        const candidates = [
            firstResp?.closest('[data-message-id]')?.querySelector('time'),
            firstResp?.closest('article')?.querySelector('time'),
            firstResp?.closest('.response-container, [class*="message"]')?.querySelector('time'),
            document.querySelector(`${aSelector.split(',')[0].trim()} time`),
        ];
        for (const el of candidates) {
            if (el?.dateTime) return new Date(el.dateTime);
        }
        return new Date();
    };

    const formatDate = (d) => {
        const pad = n => String(n).padStart(2, '0');
        const tz = d.toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ').pop();
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())} ${tz}`;
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
            [...c.querySelectorAll('h1,h2,h3,h4,h5,h6')].reverse().forEach(h => {
                const lv = Math.min(parseInt(h.tagName[1]) + 2, 6);
                const nh = document.createElement('h' + lv);
                while (h.firstChild) nh.appendChild(h.firstChild);
                h.replaceWith(nh);
            });
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
        setTimeout(() => reject(new Error('Timed out waiting for #markdown-artifact')), 3000);
    });

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
            // Remove carousel chrome
            c.querySelectorAll('sources-carousel-inline, source-inline-chip, overview-carousel').forEach(e => e.remove());
            // Demote headings +2 (h1→h3, h2→h4, cap at h6)
            [...c.querySelectorAll('h1,h2,h3,h4,h5,h6')].reverse().forEach(h => {
                const lv = Math.min(parseInt(h.tagName[1]) + 2, 6);
                const nh = document.createElement('h' + lv);
                while (h.firstChild) nh.appendChild(h.firstChild);
                h.replaceWith(nh);
            });
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
            resolve({ node: c });
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
        setTimeout(() => reject(new Error('Timed out waiting for deep-research-immersive-panel')), 3000);
    });

    const copyTranscriptFrom = async (qStartIdx) => {
        qStartIdx = Number(qStartIdx);
        const elements = [...document.querySelectorAll(`${qSelector}, ${aSelector}`)];
        const artifactMap = type === 'claude' ? buildArtifactMap() : null;
        const htmlParts = [];
        let qIdx = -1;
        let aIdx = -1;
        for (let i = 0; i < elements.length; i++) {
            const isQ = elements[i].matches(qSelector);
            if (isQ) qIdx++;
            const c = cleanEl(elements[i], type);
            if (type === 'claude') {
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
            }
            if (type === 'gemini') {
                const cloneChip = c.querySelector('immersive-entry-chip');
                if (cloneChip && elements[i].querySelector('deep-research-entry-chip-content')) {
                    const result = await openGeminiResearchReport(elements[i]);
                    cloneChip.replaceWith(result.node);
                }
            }
            if (qStartIdx <= qIdx) {
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

                const hdrs = [...c.querySelectorAll('h1,h2,h3,h4,h5')];
                if (hdrs.some(h => h.tagName === 'H1' || h.tagName === 'H2')) {
                    hdrs.reverse().forEach(h => {
                        const lv = parseInt(h.tagName[1]);
                        const nh = document.createElement('h' + Math.min(lv + 1, 6));
                        while (h.firstChild) nh.appendChild(h.firstChild);
                        h.replaceWith(nh);
                    });
                }
                htmlParts.push(c.innerHTML);
            }
        }
        if (type === 'gemini') {
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
        }
        const title = type == 'gemini'
            ? document.querySelector("span[data-test-id='conversation-title']")?.innerText || 'Gemini'
            : document.title;
        const titleEl = document.createElement("h1");
        titleEl.textContent = stripMarkdown(title);
        const sourceLink = document.createElement("a");
        sourceLink.href = location.href;
        sourceLink.textContent = location.href;
        const sourceLi = document.createElement("li");
        sourceLi.append("Source: ", sourceLink);
        const modelLi = document.createElement("li");
        modelLi.textContent = `Model: ${getModel(type)}`;
        const dateLi = document.createElement("li");
        dateLi.textContent = `Date: ${formatDate(getFirstResponseDate(aSelector))}`;
        const metaUl = document.createElement("ul");
        metaUl.append(sourceLi, modelLi, dateLi);
        if (qStartIdx == 0) {
            htmlParts.unshift(`${titleEl.outerHTML}${metaUl.outerHTML}`);
        }
        const html = htmlParts.join('\n\n');
        await navigator.clipboard.write([
            new ClipboardItem({
                'text/html': new Blob([html], { type: 'text/html' }),
                'text/plain': new Blob([htmlToText(html)], { type: 'text/plain' }),
            })
        ]);
    };

    if (!document.querySelector(qSelector)) {
        showToast('❌ No questions found on this page.', 'error');
        return;
    }

    const warnings = {
        chatgpt: () => document.querySelector('iframe[title="internal://deep-research"]') ? 'deep research report not included' : null,
    };
    const warning = warnings[type]?.();

    copyTranscriptFrom(0).then(() => {
        if (warning) {
            showToast('✅ Copied — ⚠️ ' + warning, 'warning');
        } else {
            showToast('✅ Transcript copied!');
        }
    }).catch(err => {
        showToast('❌ Copy failed. Check console.', 'error');
        console.error(err);
    });
})();
