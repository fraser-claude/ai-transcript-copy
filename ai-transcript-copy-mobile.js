(()=> {
    const id = 'fen-EA8C8B95';

    const stripMarkdown = (t) => t.replace(/(\*\*|__)(.*?)\1/g, '$2').replace(/(\*|_)(.*?)\1/g, '$2').replace(/~~(.*?)~~/g, '$1').replace(/`{1,3}(.*?)`{1,3}/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/^#+\s+/gm, '');
    if (document.getElementById(id)) {
        alert(`Dialog #${id} already rendered.`);
        return;
    }

    const cleanEl = (el, type) => {
        const c = el.cloneNode(true);
        c.querySelectorAll('button').forEach(e => e.remove());
        if (type == 'chatgpt') {
            const oP = el.querySelectorAll('#code-block-viewer');
            c.querySelectorAll('pre .items-center').forEach(e => e.remove());
            c.querySelectorAll('#code-block-viewer').forEach((e, i) => {
                const p = document.createElement('pre');
                const cd = document.createElement('code');
                cd.textContent = oP[i].innerText;
                p.appendChild(cd);
                e.closest('pre').replaceWith(p);
            });
        } else if (type == 'gemini') {
            c.querySelectorAll('code-block div.code-block-decoration, .cdk-visually-hidden, p.query-text-line br, source-footnote').forEach(e => e.remove());
            c.querySelectorAll('li').forEach(e => e.innerText = e.innerText); // eslint-disable-line no-self-assign
        } else if (type == 'claude') {
            c.querySelectorAll('.code-block__code').forEach(pre => {
                const wrapper = pre.closest('.group\\/copy');
                if (wrapper) wrapper.replaceWith(pre);
            });
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
    if (!cfg) { alert('Unsupported host: ' + location.hostname); return; }
    const [type, qSelector, aSelector] = cfg;

    const pad = '6px';
    const font = '14px sans-serif';
    const border = '1px solid #ccc';
    const colorbg = 'color:#000;background:#fff';
    const wrap = document.createElement('div');
    wrap.id = id;
    wrap.style.cssText = `position:fixed;top:10vh;right:10vw;width:80vw;z-index:2147483647;${colorbg};border:${border};padding:${pad};font:${font}`;

    const label = document.createElement('label');
    label.textContent='Copy transcript starting with:';
    label.style.cssText = `display:block;margin-bottom:${pad};font:${font}`;

    const sel = document.createElement('select');
    sel.style.cssText = `${colorbg};color-scheme:none;padding:${pad};width:75vw;font:${font}`;

    document.querySelectorAll(qSelector).forEach((q,i) => {
        const o = document.createElement('option');
        o.value = i;
        const qc = cleanEl(q, type);
        o.textContent = `Q${i+1}: ${qc.innerText.substring(0,100)}`;
        sel.appendChild(o);
    });

    const buttons = document.createElement('div');
    buttons.style.cssText = `display:block;margin-top:${pad}`;

    const createButton = (lbl) => {
        const b = document.createElement('button');
        b.textContent = lbl;
        b.style.cssText = `border:${border};padding:${pad};width:120px;${colorbg};font:${font}`;
        return b;
    };
    const ok = createButton('OK');
    const cancel = createButton('Cancel');

    const htmlToText = h => h
        .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n')
        .replace(/<h([1-6])[^>]*>(.*?)<\/h\1>/gi, (m,n,t) => '#'.repeat(+n)+' '+t+'\n\n')
        .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
        .replace(/<li[^>]*>/gi, '\n- ')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/?(?:b|strong)>/gi, '**')
        .replace(/<\/?(?:i|em)>/gi, '*')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    const copyTranscriptFrom = (qStartIdx) => {
        qStartIdx = Number(qStartIdx);
        const elements = [...document.querySelectorAll(`${qSelector}, ${aSelector}`)];
        const htmlParts = [];
        let qIdx = -1;
        for (let i = 0; i < elements.length; i++) {
            const isQ = elements[i].matches(qSelector);
            if (isQ) qIdx++;
            const c = cleanEl(elements[i], type);
            if (qStartIdx <= qIdx) {
                if (isQ) {
                    const qTxt = stripMarkdown(c.innerText.replace(/\s+/g,' ').trim());
                    const qTxtAbbr = 100 < qTxt.length ? qTxt.substring(0,100) + '...' : qTxt;
                    const qEl = document.createElement("h2");
                    qEl.textContent = `Q${qIdx+1} ${qTxtAbbr}`;
                    htmlParts.push(qEl.outerHTML);
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
                if (isQ) htmlParts.push(`<p><b>-------------</b></p>`);
            }
        }
        const title = type == 'gemini'
            ? document.querySelector("span[data-test-id='conversation-title']")?.innerText || 'Gemini'
            : document.title;
        const titleEl = document.createElement("h1");
        titleEl.textContent = stripMarkdown(title);
        const locationEl = document.createElement("p");
        locationEl.textContent = location.href;
        if (qStartIdx == 0) {
            htmlParts.unshift(`${titleEl.outerHTML}${locationEl.outerHTML}`);
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
    ok.addEventListener('click',() => {
        wrap.remove();
        try {
            copyTranscriptFrom(sel.value);
            alert('✅ Transcript copied to clipboard!');
        } catch (err) {
            alert('❌ Copy failed. Check console for details.');
            console.error(err);
        }
    });
    cancel.addEventListener('click',() => wrap.remove());

    wrap.appendChild(label);
    wrap.appendChild(sel);
    buttons.appendChild(ok);
    buttons.appendChild(cancel);
    wrap.appendChild(buttons);
    document.body.appendChild(wrap);
})();
