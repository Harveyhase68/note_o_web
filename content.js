(() => {
  'use strict';
  if (window.__noteOWebLoaded) return;
  window.__noteOWebLoaded = true;

  const { TYPES, POSTIT_COLORS, pageKey } = NOW;
  const PAGE_KEY = pageKey(location.href);
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

  // ---------------------------------------------------------------- Daten
  let data = { highlights: [], postits: [] };

  function normalize(d) {
    d = d && typeof d === 'object' ? d : {};
    const highlights = (Array.isArray(d.highlights) ? d.highlights : [])
      .filter((h) => h && typeof h.id === 'string' && typeof h.exact === 'string' && h.exact);
    const postits = (Array.isArray(d.postits) ? d.postits : [])
      .filter((p) => p && typeof p.id === 'string')
      .map((p) => ({
        ...p,
        x: Number(p.x) || 100,
        y: Number(p.y) || 100,
        w: Math.max(140, Number(p.w) || 200),
        h: Math.max(100, Number(p.h) || 160),
        text: typeof p.text === 'string' ? p.text : ''
      }));
    return { highlights, postits };
  }

  async function loadData() {
    try {
      const r = await chrome.storage.local.get(PAGE_KEY);
      data = normalize(r[PAGE_KEY]);
    } catch (e) { /* Extension neu geladen */ }
  }

  let saveTimer;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 150);
  }
  async function persist() {
    try {
      if (!data.highlights.length && !data.postits.length) {
        await chrome.storage.local.remove(PAGE_KEY);
      } else {
        await chrome.storage.local.set({ [PAGE_KEY]: data });
      }
    } catch (e) { /* Extension neu geladen */ }
  }

  // ---------------------------------------------------------------- UI-Host (Shadow DOM)
  function el(tag, attrs = {}, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'style') n.style.cssText = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c != null) n.append(c);
    return n;
  }

  const host = el('div', { id: 'now-root' });
  host.style.cssText = 'all:initial;position:absolute;top:0;left:0;width:0;height:0;z-index:2147483647;';
  const root = host.attachShadow({ mode: 'open' });

  root.append(el('style', {}, `
    *{box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
    button{all:unset;cursor:pointer;box-sizing:border-box}
    .toolbar{position:absolute;display:none;flex-direction:column;gap:4px;background:#1f2937;color:#fff;
      padding:4px;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.35);font-size:13px;user-select:none}
    .row{display:flex;gap:2px;align-items:center}
    .tb{padding:6px 9px;border-radius:7px;white-space:nowrap;font-size:13px;color:#fff}
    .tb:hover,.tb.on{background:#374151}
    .sep{width:1px;height:18px;background:#4b5563;margin:0 2px}
    .palette{display:none;gap:4px;padding:2px 4px 4px}
    .palette.open{display:flex}
    .pt{padding:5px 8px;border-radius:7px;color:#111;font-size:12px;font-weight:600;white-space:nowrap}
    .pt:hover{filter:brightness(.92)}
    .card{position:absolute;width:270px;background:#fff;color:#111;border-radius:10px;
      box-shadow:0 8px 30px rgba(0,0,0,.3);border-top:5px solid var(--c);padding:8px 10px 10px;font-size:13px}
    .card-head{display:flex;align-items:center;gap:6px;margin-bottom:6px}
    .card-title{font-weight:600;flex:1}
    .tdot{width:16px;height:16px;border-radius:50%;border:2px solid transparent}
    .tdot.on{border-color:#111}
    .icon-btn{padding:2px 6px;border-radius:6px;font-size:14px;line-height:1}
    .icon-btn:hover{background:rgba(0,0,0,.1)}
    .card textarea{width:100%;min-height:64px;resize:vertical;border:1px solid #d1d5db;border-radius:6px;
      padding:6px;font-size:13px;color:#111;background:#fff}
    .card .body{white-space:pre-wrap;line-height:1.45;max-height:220px;overflow:auto}
    .card .acts{display:flex;gap:6px;margin-top:8px}
    .card .acts .tb{background:#e5e7eb;color:#111}
    .card .acts .tb:hover{background:#d1d5db}
    .toast{position:fixed;right:16px;bottom:16px;background:#111827;color:#fff;padding:8px 14px;
      border-radius:8px;font-size:13px;box-shadow:0 4px 16px rgba(0,0,0,.4)}
    .postit{position:absolute;min-width:140px;min-height:100px;display:flex;flex-direction:column;
      background:var(--c);box-shadow:2px 4px 14px rgba(0,0,0,.28);border-radius:3px;resize:both;overflow:hidden}
    .ph{display:flex;align-items:center;justify-content:space-between;height:24px;padding:0 4px;
      background:rgba(0,0,0,.09);cursor:grab;flex:none;touch-action:none}
    .ph.drag{cursor:grabbing}
    .dots{display:flex;gap:4px}
    .dot{width:12px;height:12px;border-radius:50%;border:1px solid rgba(0,0,0,.3)}
    .postit textarea{flex:1;width:100%;border:0;outline:0;resize:none;background:transparent;padding:8px;
      font:15px/1.35 "Segoe Print","Bradley Hand","Comic Sans MS",cursive;color:#222}
  `));

  // Markierungen leben im normalen DOM, daher eigenes Page-Stylesheet.
  const pageStyle = el('style', { id: 'now-page-style' }, `
    mark.now-hl{color:inherit!important;border-radius:2px;padding:0!important;cursor:pointer}
    mark.now-hl[data-now-note]{border-bottom:2px dotted rgba(0,0,0,.5)!important}
    mark.now-hl.now-flash{outline:3px solid #2563eb;outline-offset:1px}
    ${Object.entries(TYPES).map(([k, t]) => `mark.now-hl[data-now-type="${k}"]{background:${t.color}!important}`).join('\n')}
  `);

  function mountHost() {
    if (!host.isConnected) document.documentElement.append(host);
    if (!pageStyle.isConnected) (document.head || document.documentElement).append(pageStyle);
  }

  const inHost = (e) => e.composedPath && e.composedPath().includes(host);

  function placeNear(node, rect, below = true) {
    const sx = window.scrollX, sy = window.scrollY, vw = document.documentElement.clientWidth;
    node.style.display = node.classList.contains('toolbar') ? 'flex' : 'block';
    const w = node.offsetWidth, h = node.offsetHeight;
    let left = rect.left + rect.width / 2 + sx - w / 2;
    left = Math.max(sx + 8, Math.min(left, sx + vw - w - 8));
    let top;
    if (below) top = rect.bottom + sy + 8;
    else top = rect.top - h - 10 < 4 ? rect.bottom + sy + 10 : rect.top + sy - h - 10;
    node.style.left = left + 'px';
    node.style.top = top + 'px';
  }

  function toast(msg) {
    const t = el('div', { class: 'toast' }, msg);
    root.append(t);
    setTimeout(() => t.remove(), 1800);
  }

  // ---------------------------------------------------------------- Text-Index & Anchoring
  function buildIndex() {
    const nodes = [];
    let text = '';
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentElement;
        if (!p || !n.nodeValue) return NodeFilter.FILTER_REJECT;
        if (p.closest('script,style,noscript,textarea,#now-root')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let n;
    while ((n = walker.nextNode())) {
      nodes.push({ node: n, start: text.length });
      text += n.nodeValue;
    }
    return { nodes, text };
  }

  function boundaryOffset(idx, container, offset) {
    if (container.nodeType === Node.TEXT_NODE) {
      const e = idx.nodes.find((x) => x.node === container);
      if (e) return e.start + offset;
    }
    const probe = document.createRange();
    probe.setStart(container, offset);
    probe.collapse(true);
    for (const e of idx.nodes) {
      if (probe.comparePoint(e.node, 0) >= 0) return e.start;
    }
    return idx.text.length;
  }

  function anchorFromRange(range) {
    const idx = buildIndex();
    let s = boundaryOffset(idx, range.startContainer, range.startOffset);
    let e = boundaryOffset(idx, range.endContainer, range.endOffset);
    while (s < e && /\s/.test(idx.text[s])) s++;
    while (e > s && /\s/.test(idx.text[e - 1])) e--;
    if (e <= s || e - s > 10000) return null;
    return {
      exact: idx.text.slice(s, e),
      prefix: idx.text.slice(Math.max(0, s - 32), s),
      suffix: idx.text.slice(e, e + 32)
    };
  }

  function commonSuffixLen(a, b) {
    let i = 0;
    while (i < a.length && i < b.length && a[a.length - 1 - i] === b[b.length - 1 - i]) i++;
    return i;
  }
  function commonPrefixLen(a, b) {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return i;
  }

  function locate(h, idx) {
    let from = 0, best = -1, bestScore = -1;
    while (true) {
      const i = idx.text.indexOf(h.exact, from);
      if (i < 0) break;
      const pre = idx.text.slice(Math.max(0, i - (h.prefix || '').length), i);
      const suf = idx.text.slice(i + h.exact.length, i + h.exact.length + (h.suffix || '').length);
      const score = commonSuffixLen(pre, h.prefix || '') + commonPrefixLen(suf, h.suffix || '');
      if (score > bestScore) { bestScore = score; best = i; }
      from = i + 1;
    }
    return best < 0 ? null : [best, best + h.exact.length];
  }

  // ---------------------------------------------------------------- Highlights
  const typeOf = (h) => (TYPES[h.type] ? h.type : 'comment');
  const pending = new Set();

  function wrapRange(idx, s, e, h) {
    const parts = [];
    for (const en of idx.nodes) {
      const ns = en.start, ne = ns + en.node.nodeValue.length;
      if (ne <= s) continue;
      if (ns >= e) break;
      parts.push({ node: en.node, from: Math.max(s, ns) - ns, to: Math.min(e, ne) - ns });
    }
    let made = 0;
    for (let i = parts.length - 1; i >= 0; i--) {
      let { node, from, to } = parts[i];
      if (!node.nodeValue.slice(from, to).trim()) continue;
      if (to < node.nodeValue.length) node.splitText(to);
      if (from > 0) node = node.splitText(from);
      const m = el('mark', { class: 'now-hl', 'data-now-id': h.id, 'data-now-type': typeOf(h) });
      if (h.note) m.setAttribute('data-now-note', '1');
      node.parentNode.insertBefore(m, node);
      m.append(node);
      made++;
    }
    return made;
  }

  function renderHighlight(h) {
    const idx = buildIndex();
    const range = locate(h, idx);
    const ok = range && wrapRange(idx, range[0], range[1], h) > 0;
    if (ok) pending.delete(h.id); else pending.add(h.id);
    return ok;
  }

  const marksOf = (id) => document.querySelectorAll(`mark.now-hl[data-now-id="${CSS.escape(id)}"]`);

  function unwrapHighlight(id) {
    for (const m of marksOf(id)) {
      const p = m.parentNode;
      while (m.firstChild) p.insertBefore(m.firstChild, m);
      m.remove();
      p.normalize();
    }
  }

  function renderAllHighlights() {
    for (const h of data.highlights) renderHighlight(h);
  }

  function clearAllHighlights() {
    for (const h of data.highlights) unwrapHighlight(h.id);
    pending.clear();
  }

  function createHighlight(type) {
    if (!current) return;
    const a = anchorFromRange(current.range);
    if (!a) { toast('Auswahl konnte nicht markiert werden'); return; }
    const h = { id: uid(), type, ...a, note: '', created: Date.now() };
    data.highlights.push(h);
    renderHighlight(h);
    save();
    hideToolbar();
    getSelection().removeAllRanges();
    const m = marksOf(h.id)[0];
    if (m) openFlyout(h, m.getBoundingClientRect(), true);
  }

  // ---------------------------------------------------------------- Fly-out (Tooltip + Notiz)
  let fly = null, flyTimer;

  function closeFlyout() {
    clearTimeout(flyTimer);
    if (fly) { fly.card.remove(); fly = null; }
  }
  function scheduleClose() {
    clearTimeout(flyTimer);
    flyTimer = setTimeout(() => {
      if (fly && !fly.card.matches(':focus-within') && !fly.card.matches(':hover')) closeFlyout();
    }, 400);
  }

  function setHighlightType(h, key, card) {
    h.type = key;
    for (const m of marksOf(h.id)) m.setAttribute('data-now-type', key);
    const t = TYPES[key];
    card.style.setProperty('--c', t.color);
    card.querySelector('.card-title').textContent = `${t.icon} ${t.label}`;
    card.querySelectorAll('.tdot').forEach((d) => d.classList.toggle('on', d.dataset.key === key));
    save();
  }

  function openFlyout(h, rect, focus) {
    closeFlyout();
    mountHost();
    const t = TYPES[typeOf(h)];
    const ta = el('textarea', { placeholder: 'Notiz hinzufügen …', rows: '3' });
    ta.value = h.note || '';
    ta.addEventListener('input', () => {
      h.note = ta.value;
      for (const m of marksOf(h.id)) {
        if (h.note) m.setAttribute('data-now-note', '1'); else m.removeAttribute('data-now-note');
      }
      save();
    });
    const card = el('div', { class: 'card', style: `--c:${t.color}` },
      el('div', { class: 'card-head' },
        el('span', { class: 'card-title' }, `${t.icon} ${t.label}`),
        Object.entries(TYPES).map(([k, tt]) => el('button', {
          class: 'tdot' + (k === typeOf(h) ? ' on' : ''), 'data-key': k, title: tt.label,
          style: `background:${tt.color}`, onclick: () => setHighlightType(h, k, card)
        })),
        el('button', {
          class: 'icon-btn', title: 'Markierung löschen', onclick: () => {
            unwrapHighlight(h.id);
            data.highlights = data.highlights.filter((x) => x.id !== h.id);
            save();
            closeFlyout();
          }
        }, '🗑')
      ),
      ta
    );
    card.addEventListener('mouseenter', () => clearTimeout(flyTimer));
    card.addEventListener('mouseleave', scheduleClose);
    root.append(card);
    placeNear(card, rect, true);
    fly = { id: h.id, card };
    if (focus) ta.focus();
  }

  document.addEventListener('mouseover', (e) => {
    const m = e.target instanceof Element && e.target.closest('mark.now-hl');
    if (!m) return;
    const h = data.highlights.find((x) => x.id === m.dataset.nowId);
    if (!h) return;
    clearTimeout(flyTimer);
    if (fly && fly.id === h.id) return;
    flyTimer = setTimeout(() => openFlyout(h, m.getBoundingClientRect(), false), 150);
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target instanceof Element && e.target.closest('mark.now-hl')) {
      clearTimeout(flyTimer);
      scheduleClose();
    }
  });
  document.addEventListener('click', (e) => {
    const m = e.target instanceof Element && e.target.closest('mark.now-hl');
    if (!m || m.closest('a')) return;
    const h = data.highlights.find((x) => x.id === m.dataset.nowId);
    if (h) openFlyout(h, m.getBoundingClientRect(), true);
  });

  // ---------------------------------------------------------------- Auswahl-Toolbar
  let current = null; // { range, text }
  let resultCard = null;

  const palette = el('div', { class: 'palette' },
    Object.entries(TYPES).map(([k, t]) => el('button', {
      class: 'pt', style: `background:${t.color}`, onclick: () => createHighlight(k)
    }, `${t.icon} ${t.label}`))
  );
  const markBtn = el('button', { class: 'tb', onclick: () => {
    palette.classList.toggle('open');
    markBtn.classList.toggle('on');
    placeNear(toolbar, current.range.getBoundingClientRect(), false);
  } }, '🖍 Markieren');

  const toolbar = el('div', { class: 'toolbar' },
    el('div', { class: 'row' },
      el('button', { class: 'tb', onclick: actCopy }, '📋 Kopieren'),
      el('button', { class: 'tb', onclick: actSearch }, '🔍 Suchen'),
      el('button', { class: 'tb', onclick: actTranslate }, '🌐 Übersetzen'),
      el('button', { class: 'tb', onclick: actSummarize }, '✨ Zusammenfassen'),
      el('span', { class: 'sep' }),
      markBtn,
      el('button', { class: 'tb', onclick: actPostit }, '🗒 Post-it')
    ),
    palette
  );
  toolbar.addEventListener('mousedown', (e) => e.preventDefault()); // Auswahl behalten
  root.append(toolbar);

  function showToolbar(range) {
    mountHost();
    palette.classList.remove('open');
    markBtn.classList.remove('on');
    placeNear(toolbar, range.getBoundingClientRect(), false);
  }
  function hideToolbar() {
    toolbar.style.display = 'none';
    palette.classList.remove('open');
    markBtn.classList.remove('on');
  }
  function closeResult() { if (resultCard) { resultCard.remove(); resultCard = null; } }

  function actCopy() {
    const text = current.text;
    const done = () => toast('In Zwischenablage kopiert');
    navigator.clipboard.writeText(text).then(done, () => {
      const ta = el('textarea', { style: 'position:fixed;opacity:0' });
      ta.value = text;
      document.body.append(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      done();
    });
    hideToolbar();
  }
  function actSearch() {
    window.open('https://www.google.com/search?q=' + encodeURIComponent(current.text.slice(0, 300)), '_blank', 'noopener');
    hideToolbar();
  }
  function actTranslate() {
    const lang = (navigator.language || 'de').slice(0, 2);
    window.open(`https://translate.google.com/?sl=auto&tl=${lang}&op=translate&text=${encodeURIComponent(current.text.slice(0, 2000))}`, '_blank', 'noopener');
    hideToolbar();
  }
  function actPostit() {
    const quote = '„' + current.text.slice(0, 500) + '“\n\n';
    createPostit('yellow', quote);
    hideToolbar();
    getSelection().removeAllRanges();
  }

  // Lokale, extraktive Kurzfassung (kein KI-Modell, keine Datenübertragung).
  function summarize(text) {
    const sentences = (text.replace(/\s+/g, ' ').match(/[^.!?…]+[.!?…]+(?=\s|$)|[^.!?…]+$/g) || [])
      .map((s) => s.trim()).filter(Boolean);
    if (sentences.length < 3) return null;
    const stop = new Set(('der die das und oder aber ein eine ist sind war the and for with that this are was not nicht mit von zu den dem des im auf für auch sich es er sie wir ihr wird werden wurde dass wie als bei nach aus').split(' '));
    const words = (s) => (s.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []).filter((w) => !stop.has(w));
    const freq = {};
    for (const s of sentences) for (const w of words(s)) freq[w] = (freq[w] || 0) + 1;
    const scored = sentences.map((s, i) => {
      const w = words(s);
      return { i, s, score: w.reduce((a, x) => a + freq[x], 0) / Math.sqrt(w.length || 1) };
    });
    const n = Math.min(3, Math.max(1, Math.round(sentences.length / 3)));
    return scored.sort((a, b) => b.score - a.score).slice(0, n).sort((a, b) => a.i - b.i).map((x) => x.s).join(' ');
  }

  function actSummarize() {
    const rect = current.range.getBoundingClientRect();
    const summary = summarize(current.text);
    hideToolbar();
    closeResult();
    const body = el('div', { class: 'body' },
      summary || 'Der markierte Text ist zu kurz für eine Zusammenfassung. Bitte mehr Text markieren (mindestens drei Sätze).');
    resultCard = el('div', { class: 'card', style: '--c:#a78bfa' },
      el('div', { class: 'card-head' },
        el('span', { class: 'card-title' }, '✨ Kurzfassung (lokal)'),
        el('button', { class: 'icon-btn', onclick: closeResult }, '✕')
      ),
      body,
      summary && el('div', { class: 'acts' },
        el('button', { class: 'tb', onclick: () => { navigator.clipboard.writeText(summary); toast('Kopiert'); } }, '📋 Kopieren'),
        el('button', { class: 'tb', onclick: () => { createPostit('purple', summary); closeResult(); } }, '🗒 Als Post-it')
      )
    );
    root.append(resultCard);
    placeNear(resultCard, rect, true);
  }

  function onSelectionMaybe(e) {
    if (inHost(e)) return;
    setTimeout(() => {
      const sel = getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
      const text = sel.toString().trim();
      if (text.length < 2) return;
      const r = sel.getRangeAt(0);
      const anc = r.commonAncestorContainer;
      const elx = anc.nodeType === Node.ELEMENT_NODE ? anc : anc.parentElement;
      if (!elx || elx.closest('input,textarea,[contenteditable=""],[contenteditable="true"],#now-root')) return;
      current = { range: r.cloneRange(), text };
      closeResult();
      showToolbar(r);
    }, 10);
  }
  document.addEventListener('mouseup', onSelectionMaybe, true);
  document.addEventListener('keyup', (e) => {
    if (e.shiftKey || e.key === 'Shift') onSelectionMaybe(e);
  }, true);

  document.addEventListener('mousedown', (e) => {
    if (inHost(e)) return;
    hideToolbar();
    if (!(e.target instanceof Element && e.target.closest('mark.now-hl'))) { closeFlyout(); closeResult(); }
  }, true);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { hideToolbar(); closeFlyout(); closeResult(); }
  }, true);
  document.addEventListener('selectionchange', () => {
    const sel = getSelection();
    if (sel && sel.isCollapsed && toolbar.style.display !== 'none') hideToolbar();
  });

  // ---------------------------------------------------------------- Post-its
  let z = 1;
  const postitNodes = new Map();

  function buildPostit(p) {
    const color = POSTIT_COLORS[p.color] ? p.color : 'yellow';
    const node = el('div', {
      class: 'postit',
      style: `--c:${POSTIT_COLORS[color]};left:${p.x}px;top:${p.y}px;width:${p.w}px;height:${p.h}px;z-index:${++z}`
    });
    const dots = Object.entries(POSTIT_COLORS).map(([k, v]) => el('button', {
      class: 'dot', title: k, style: `background:${v}`,
      onclick: () => { p.color = k; node.style.setProperty('--c', v); save(); }
    }));
    const del = el('button', {
      class: 'icon-btn', title: 'Post-it löschen', onclick: () => {
        if (p.text.trim() && !confirm('Dieses Post-it löschen?')) return;
        node.remove();
        postitNodes.delete(p.id);
        data.postits = data.postits.filter((x) => x.id !== p.id);
        save();
      }
    }, '×');
    const header = el('div', { class: 'ph' }, el('div', { class: 'dots' }, dots), del);
    const ta = el('textarea', { placeholder: 'Notiz …', spellcheck: 'false' });
    ta.value = p.text;
    ta.addEventListener('input', () => { p.text = ta.value; save(); });
    node.addEventListener('pointerdown', () => { node.style.zIndex = ++z; });
    node.append(header, ta);

    header.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      const sx = e.clientX, sy = e.clientY, ox = p.x, oy = p.y;
      header.setPointerCapture(e.pointerId);
      header.classList.add('drag');
      const move = (ev) => {
        p.x = Math.max(0, ox + ev.clientX - sx);
        p.y = Math.max(0, oy + ev.clientY - sy);
        node.style.left = p.x + 'px';
        node.style.top = p.y + 'px';
      };
      const up = () => {
        header.classList.remove('drag');
        header.removeEventListener('pointermove', move);
        header.removeEventListener('pointerup', up);
        save();
      };
      header.addEventListener('pointermove', move);
      header.addEventListener('pointerup', up);
      e.preventDefault();
    });

    let first = true;
    new ResizeObserver(() => {
      if (first) { first = false; return; }
      const w = Math.round(node.offsetWidth), h = Math.round(node.offsetHeight);
      if (w !== p.w || h !== p.h) { p.w = w; p.h = h; save(); }
    }).observe(node);

    postitNodes.set(p.id, node);
    root.append(node);
    return { node, ta };
  }

  function renderAllPostits() {
    mountHost();
    for (const n of postitNodes.values()) n.remove();
    postitNodes.clear();
    for (const p of data.postits) buildPostit(p);
  }

  function createPostit(color = 'yellow', text = '') {
    mountHost();
    const n = data.postits.length;
    const p = {
      id: uid(), color, text,
      x: window.scrollX + Math.max(20, window.innerWidth / 2 - 100) + (n % 6) * 24,
      y: window.scrollY + 120 + (n % 6) * 24,
      w: 220, h: 170, created: Date.now()
    };
    data.postits.push(p);
    const { ta } = buildPostit(p);
    save();
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
  }

  // ---------------------------------------------------------------- Start, Nachrichten, Sync
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'new-postit') {
      createPostit(POSTIT_COLORS[msg.color] ? msg.color : 'yellow');
    } else if (msg?.type === 'goto') {
      const m = marksOf(String(msg.id))[0];
      if (m) {
        m.scrollIntoView({ block: 'center', behavior: 'smooth' });
        marksOf(String(msg.id)).forEach((x) => x.classList.add('now-flash'));
        setTimeout(() => marksOf(String(msg.id)).forEach((x) => x.classList.remove('now-flash')), 1500);
      } else {
        const n = postitNodes.get(String(msg.id));
        if (n) { n.scrollIntoView({ block: 'center', behavior: 'smooth' }); n.style.zIndex = ++z; }
      }
    }
  });

  // Änderungen von außen (Restore, anderer Tab) übernehmen.
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes[PAGE_KEY]) return;
      const incoming = normalize(changes[PAGE_KEY].newValue);
      if (JSON.stringify(incoming) === JSON.stringify(data)) return;
      closeFlyout();
      clearAllHighlights();
      data = incoming;
      renderAllHighlights();
      renderAllPostits();
    });
  } catch (e) { /* ignore */ }

  // Dynamische Seiten: nicht gefundene Markierungen später erneut versuchen.
  let attempts = 0, moTimer;
  new MutationObserver(() => {
    if (!pending.size || attempts > 30) return;
    clearTimeout(moTimer);
    moTimer = setTimeout(() => {
      attempts++;
      for (const h of data.highlights) if (pending.has(h.id)) renderHighlight(h);
    }, 800);
  }).observe(document.body, { childList: true, subtree: true });

  (async () => {
    await loadData();
    if (data.highlights.length || data.postits.length) {
      mountHost();
      renderAllHighlights();
      renderAllPostits();
    }
  })();
})();
