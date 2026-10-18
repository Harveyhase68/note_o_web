(async () => {
  const { TYPES, POSTIT_COLORS, pageKey } = NOW;
  const $ = (id) => document.getElementById(id);

  await NOW.loadLang();
  NOW.applyDom(document);

  $('opts').addEventListener('click', () => { chrome.runtime.openOptionsPage(); window.close(); });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !/^https?:/.test(tab.url)) { $('na').hidden = false; return; }
  $('main').hidden = false;
  $('url').textContent = tab.url;

  for (const [k, v] of Object.entries(POSTIT_COLORS)) {
    const b = document.createElement('button');
    b.style.background = v;
    b.title = NOW.colorLabel(k);
    b.addEventListener('click', async () => {
      await chrome.tabs.sendMessage(tab.id, { type: 'new-postit', color: k }).catch(() => {});
      window.close();
    });
    $('colors').append(b);
  }

  const key = pageKey(tab.url);
  const r = await chrome.storage.local.get(key);
  const d = r[key] || {};
  const typeKey = (h) => (TYPES[h.type] ? h.type : 'comment');
  const rows = [
    ...(d.highlights || []).map((h) => ({
      id: h.id, color: TYPES[typeKey(h)].color,
      title: h.exact, sub: h.note || NOW.typeLabel(typeKey(h))
    })),
    ...(d.postits || []).map((p) => ({
      id: p.id, color: POSTIT_COLORS[p.color] || POSTIT_COLORS.yellow,
      title: '🗒 ' + (p.text || NOW.t('pop.emptyPostit')), sub: NOW.t('pop.postitSub')
    }))
  ];
  $('empty').hidden = rows.length > 0;
  for (const row of rows) {
    const li = document.createElement('li');
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.style.background = row.color;
    const txt = document.createElement('div');
    txt.className = 'txt';
    const b = document.createElement('b');
    b.textContent = row.title;
    const s = document.createElement('small');
    s.textContent = row.sub;
    txt.append(b, s);
    li.append(chip, txt);
    li.addEventListener('click', async () => {
      await chrome.tabs.sendMessage(tab.id, { type: 'goto', id: row.id }).catch(() => {});
      window.close();
    });
    $('list').append(li);
  }
})();
