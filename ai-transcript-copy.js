(()=> {
    const id = 'fen-EA8C8B95';
    
    const stripMarkdown = (t) => t.replace(/(\*\*|__)(.*?)\1/g, '$2').replace(/(\*|_)(.*?)\1/g, '$2').replace(/~~(.*?)~~/g, '$1').replace(/`{1,3}(.*?)`{1,3}/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/^#+\s+/gm, '');
    if (document.getElementById(id)) {
        alert(`Dialog #${id} already rendered.`);
        return;
    }
    
    const cleanEl = (el, type) => {
        const c = el.cloneNode(true);
        c.querySelectorAll('button').forEach((e,i) => e.remove());
        if (type == 'chatgpt') {
            const oP = el.querySelectorAll('#code-block-viewer');
            c.querySelectorAll('pre .items-center').forEach((e,i) => e.remove());            
            c.querySelectorAll('#code-block-viewer').forEach((e,i) => {
                e.textContent = '\n```\n' + oP[i].innerText + '\n```\n\n';
            });
            c.querySelectorAll('code').forEach((e,i) => e.innerText = '`' + e.innerText + '`');
        } else if (type == 'gemini') {
            c.querySelectorAll('code-block div.code-block-decoration, .cdk-visually-hidden, p.query-text-line br').forEach((e,i) => e.remove());
            c.querySelectorAll('li').forEach((e,i) => e.innerText = e.innerText); // eslint-disable-line no-self-assign
        }
        return c;
    };

    window.getSelection().removeAllRanges();
    const {hostname,pathname,search} = location;
    let type = null;
    if (location.hostname == 'chatgpt.com') {
        type = 'chatgpt';
    } else if (location.hostname == 'gemini.google.com') {
        type = 'gemini';
    } else if (location.hostname == 'notebooklm.google.com') {
        type = 'notebooklm'
    } else if (location.hostname == 'claude.ai') {
        type = 'claude'
    } else {
        alert(`Unsupported host for copying transcript: ${location.hostname}`);
        return;
    }
    let qSelector = null;
    let aSelector = null;
    if (type == 'chatgpt') {
        qSelector = "div[data-message-author-role='user']";
        aSelector = "div[data-message-author-role='assistant']";
    } else if (type == 'gemini') {
        qSelector = "user-query .query-text";
        aSelector = "model-response message-content, #extended-response-message-content";
    } else if (type == 'notebooklm') {
        qSelector = '.from-user-message-inner-content';
        aSelector = '.to-user-message-inner-content';
    } else if (type == 'claude') {
        qSelector = "div[data-testid='user-message']";
        aSelector = '.font-claude-response';
    }
    
    
    const wrap = document.createElement('div');
    const font = '14px sans-serif';
    const color = '#000';
    const background = '#fff';
    const padding = '6px'
    const border = '1px solid #ccc';
    wrap.id = id;
    wrap.style.position='fixed';
    wrap.style.top='calc(10vh)';
    wrap.style.right='calc(10vw)';
    wrap.style.width='calc(80vw)';
    wrap.style.zIndex='2147483647';
    wrap.style.color=color;
    wrap.style.background=background;
    wrap.style.border=border;
    wrap.style.padding=padding;
    wrap.style.font=font;
    
    const label = document.createElement('label');
    label.textContent='Copy transcript starting with:';
    label.style.display='block';
    label.style.marginBottom=padding;
    label.style.font=font;
    
    const sel = document.createElement('select');
    sel.style.color=color;
    sel.style.background=background;
    sel.style.colorScheme='none';
    sel.style.padding=padding;
    sel.style.width = 'calc(75vw)';
    sel.style.font=font;
    
    document.querySelectorAll(qSelector).forEach((q,i) => {
        const o = document.createElement('option');
        o.value = i;
        const qc = cleanEl(q, type)
        o.textContent = `Q${i+1}: ${qc.innerText.substring(0,100)}`;
        sel.appendChild(o);
    });
    
    const buttons = document.createElement('div');
    buttons.style.display = 'block';
    buttons.style.marginTop = padding;
    
    const createButton = (label) => {
        const b = document.createElement('button');
        b.textContent=label;
        b.style.border='1px solid #ccc';
        b.style.padding=padding;
        b.style.width = '120px';
        b.style.color=color;
        b.style.background=background;
        b.style.font=font;
        return b;
    };
    const ok = createButton('OK');
    const cancel = createButton('Cancel');

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
                

                const headers = Array.from(c.querySelectorAll('h1, h2, h3, h4, h5, h6'));
                if (headers.some(h => h.tagName === 'H1' || h.tagName === 'H2')) {
                    headers.sort((a, b) => b.tagName.localeCompare(a.tagName)).forEach(h => {
                        const level = parseInt(h.tagName[1]);
                        if (level < 6) {
                            const newH = document.createElement(`h${level + 1}`);
                            while (h.firstChild) {
                                newH.appendChild(h.firstChild);
                            }
                            Array.from(h.attributes).forEach(attr => newH.setAttribute(attr.name, attr.value));
                            h.parentNode.replaceChild(newH, h);
                        }
                    });
                }
                htmlParts.push(c.innerHTML);
                if (isQ) htmlParts.push(`<p><b>-------------</b></p>`);
            }
        }
        const titleEl = document.createElement("h1");
        let title = null;
        if (type == 'chatgpt') {
            title = document.title;
        } else if (type == 'gemini') {
            title = document.querySelector("span[data-test-id='conversation-title']")?.innerText || 'Gemini';
        } else if (type == 'notebooklm') {
            title = document.title;
        } else if (type == 'claude') {
            title = document.title;
        }
        titleEl.textContent = stripMarkdown(title);
        const locationEl = document.createElement("p");
        locationEl.textContent = location.href;
        if (qStartIdx == 0) {
            htmlParts.unshift(`${titleEl.outerHTML}${locationEl.outerHTML}`);
        }
        const html = htmlParts.join('\n\n');
        function onCopy(e) {
            e.clipboardData.setData('text/html', html);
            e.clipboardData.setData('text/plain', html.replace(/<[^>]+>/g, ''));
            e.preventDefault();
        }
    
        document.addEventListener('copy', onCopy, { once: true });
        const successful = document.execCommand('copy');
        if (!successful) {
            document.removeEventListener('copy', onCopy);
            throw new Error('execCommand copy failed');
        }
    };
    ok.addEventListener('click',(e) => {
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
