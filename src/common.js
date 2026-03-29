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
    t.style.cssText = `position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:2147483647;padding:10px 16px;border-radius:6px;font:14px sans-serif;color:#fff;background:${bg};box-shadow:0 2px 8px rgba(0,0,0,.3);transition:opacity .4s;max-width:90vw;word-break:break-word`;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 2500);
};

const stripMarkdown = (t) => t.replace(/(\*\*|__)(.*?)\1/g, '$2').replace(/(\*|_)(.*?)\1/g, '$2').replace(/~~(.*?)~~/g, '$1').replace(/`{1,3}(.*?)`{1,3}/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/^#+\s+/gm, '');

const htmlToText = h => {
    const codes = [];
    return h
        .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_, c) => '\n\n\uE000' + (codes.push(c.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")) - 1) + '\uE000\n\n')
        .replace(/<blockquote[^>]*>/gi, '\uE001')
        .replace(/<\/blockquote>/gi, '\uE002')
        .replace(/<h([1-6])[^>]*>(.*?)<\/h\1>/gi, (m,n,t) => '\n\n'+'#'.repeat(+n)+' '+t+'\n\n')
        .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
        .replace(/<a[^>]+href="([^"]*)"[^>]*>(.*?)<\/a>/gi, (m,href,txt) => txt ? '['+txt+']('+href+')' : href)
        .replace(/<hr\s*\/?>/gi, '\n---\n')
        .replace(/<thead[^>]*>([\s\S]*?)<\/thead>/gi, (_, inner) => inner.replace(/<tr/gi, '<tr data-th'))
        .replace(/<\/?(?:thead|tbody|tfoot)[^>]*>/gi, '')
        .replace(/<\/?table[^>]*>/gi, '\n')
        .replace(/<tr([^>]*)>([\s\S]*?)<\/tr>/gi, (_, attrs, cells) => {
            const isHeader = /data-th/.test(attrs) || /<th[\s>]/i.test(cells);
            const row = cells.replace(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi, (_,c) => c.trim()+' | ').trimEnd().replace(/\|\s*$/, '');
            if (isHeader) { const cols = (row.match(/\|/g) || []).length + 1; return row + '\n' + Array(cols).fill('---').join(' | ') + '\n'; }
            return row + '\n';
        })
        .replace(/<li[^>]*>\s*<p[^>]*>/gi, '<li>')
        .replace(/<li[^>]*>/gi, '\n- ')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<p[^>]*>/gi, '\n\n')
        .replace(/<\/?(b|strong)\b[^>]*>/gi, '**')
        .replace(/<\/?(i|em)\b[^>]*>/gi, '*')
        .replace(/<img[^>]*>/gi, m => { const alt = (m.match(/alt="([^"]*)"/i)?.[1] || '').replace(/^[\s,]+|[\s,]+$/g, ''); const src = m.match(/src="([^"]*)"/i)?.[1] || ''; return src ? `![${alt}](${src})\n` : ''; })
        .replace(/<\/div>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .replace(/[ \t]*\n[ \t]*/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\uE001([\s\S]*?)\uE002/g, (_, inner) => inner.trim().split('\n').map(l => l ? '> ' + l : '>').join('\n'))
        .trim()
        .replace(/\uE000(\d+)\uE000/g, (_, i) => '```\n' + codes[+i] + '\n```');
};

const formatDate = (d) => {
    const pad = n => String(n).padStart(2, '0');
    const tz = d.toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ').pop();
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())} ${tz}`;
};

const getModel = (type) => {
    const vendorName = { chatgpt: 'ChatGPT', claude: 'Claude', gemini: 'Gemini', notebooklm: 'NotebookLM' }[type] || type;
    const selectors = {
        chatgpt: ['button[data-testid="model-switcher-dropdown-button"]', '[data-message-model-slug]'],
        claude:  ['button[data-testid="model-selector-dropdown"]'],
        gemini:  ['[data-test-id="bard-mode-menu-button"]'],
    }[type] || [];
    for (const s of selectors) {
        const el = document.querySelector(s);
        const text = (el?.dataset?.messageModelSlug || el?.textContent)?.trim();
        if (!text) continue;
        return text.startsWith(vendorName) ? text : `${vendorName} ${text}`;
    }
    return vendorName;
};

const demoteHeadings = (el, by) => {
    [...el.querySelectorAll('h1,h2,h3,h4,h5,h6')].reverse().forEach(h => {
        const lv = Math.min(parseInt(h.tagName[1]) + by, 6);
        const nh = document.createElement('h' + lv);
        while (h.firstChild) nh.appendChild(h.firstChild);
        h.replaceWith(nh);
    });
};

const writeTranscript = async (htmlParts, title, vendorType, startIdx) => {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const dateStamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
    const titleEl = document.createElement("h1");
    titleEl.textContent = `${dateStamp} - ${stripMarkdown(title)}`;
    const sourceLink = document.createElement("a");
    sourceLink.href = location.href;
    sourceLink.textContent = location.href;
    const sourceLi = document.createElement("li");
    sourceLi.append("Source: ", sourceLink);
    const modelLi = document.createElement("li");
    modelLi.textContent = `Model: ${getModel(vendorType)}`;
    const dateLi = document.createElement("li");
    dateLi.textContent = `Date: ${formatDate(new Date())}`;
    const vendorNames = { chatgpt: "ChatGPT", claude: "Claude", gemini: "Gemini", notebooklm: "NotebookLM" };
    const formatLi = document.createElement("li");
    formatLi.textContent = `This is a transcript between the user (Q1,Q2,... headers) and ${vendorNames[vendorType] || vendorType} (A1,A2,... headers)`;
    const metaUl = document.createElement("ul");
    metaUl.append(sourceLi, modelLi, dateLi, formatLi);
    if (startIdx == 0) {
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
