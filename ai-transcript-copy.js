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
            // Remove artifact-block references (content is in inaccessible iframe)
            c.querySelectorAll('[class*="artifact-block"]').forEach(e => e.remove());
        }
        return c;
    };

    window.getSelection().removeAllRanges();
    const V = {
        'chatgpt.com':  ['chatgpt', "div[data-message-author-role='user']", "div[data-message-author-role='assistant']"],
        'gemini.google.com': ['gemini', 'user-query .query-text', 'model-response message-content, #extended-response-message-content'],
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

    const copyTranscriptFrom = (qStartIdx) => {
        qStartIdx = Number(qStartIdx);
        const elements = [...document.querySelectorAll(`${qSelector}, ${aSelector}`)];
        const htmlParts = [];
        let qIdx = -1;
        let aIdx = -1;
        for (let i = 0; i < elements.length; i++) {
            const isQ = elements[i].matches(qSelector);
            if (isQ) qIdx++;
            const c = cleanEl(elements[i], type);
            if (qStartIdx <= qIdx) {
                if (isQ) {
                    const qTxt = stripMarkdown(c.innerText.replace(/\s+/g,' ').trim());
                    const qTxtAbbr = 100 < qTxt.length ? qTxt.substring(0,100) + '...' : qTxt;
                    const qEl = document.createElement("h2");
                    qEl.textContent = `Q${qIdx+1}: ${qTxtAbbr}`;
                    htmlParts.push(qEl.outerHTML);
                } else {
                    aIdx++;
                    const isDeepResearch = !!elements[i].closest('deep-research-immersive-panel');
                    const aLabel = isDeepResearch
                        ? `A${aIdx+1}: Deep Research \u2014 ${document.querySelector('deep-research-immersive-panel toolbar')?.innerText?.trim().split('\n')[0] || 'Deep Research'}`
                        : `A${aIdx+1}`;
                    const aEl = document.createElement("h2");
                    aEl.textContent = aLabel;
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
        function onCopy(e) {
            e.clipboardData.setData('text/html', html);
            e.clipboardData.setData('text/plain', htmlToText(html));
            e.preventDefault();
        }

        document.addEventListener('copy', onCopy, { once: true });
        const successful = document.execCommand('copy');
        if (!successful) {
            document.removeEventListener('copy', onCopy);
            throw new Error('execCommand copy failed');
        }
    };

    if (!document.querySelector(qSelector)) {
        showToast('❌ No questions found on this page.', 'error');
        return;
    }

    const warnings = {
        chatgpt: () => document.querySelector('iframe[title="internal://deep-research"]') ? 'deep research report not included' : null,
        claude:  () => document.querySelector('[class*="artifact-block"]') ? 'artifact content not included' : null,
    };
    const warning = warnings[type]?.();

    try {
        copyTranscriptFrom(0);
        if (warning) {
            showToast('✅ Copied — ⚠️ ' + warning, 'warning');
        } else {
            showToast('✅ Transcript copied!');
        }
    } catch (err) {
        showToast('❌ Copy failed. Check console.', 'error');
        console.error(err);
    }
})();
