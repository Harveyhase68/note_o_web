// Gemeinsame Konstanten und Backup-Helfer für Content-Script, Popup, Optionen und Service Worker.
globalThis.NOW = {
  TYPES: {
    comment:   { label: 'Kommentar', color: '#fde68a', icon: '💬' },
    important: { label: 'Wichtig',   color: '#fdba74', icon: '⭐' },
    alert:     { label: 'Achtung',   color: '#fca5a5', icon: '⚠️' },
    question:  { label: 'Frage',     color: '#a5d8ff', icon: '❓' },
    idea:      { label: 'Idee',      color: '#b2f2bb', icon: '💡' }
  },
  POSTIT_COLORS: {
    yellow: '#fff59d',
    pink:   '#f8bbd0',
    blue:   '#b3e5fc',
    green:  '#c8e6c9',
    orange: '#ffe0b2',
    purple: '#e1bee7'
  },

  // Notizen werden pro exakter URL (ohne #Hash) gespeichert.
  pageKey(urlString) {
    const u = new URL(urlString);
    return 'page:' + u.origin + u.pathname + u.search;
  },

  // ---- Backup-Format ------------------------------------------------------
  async allPages() {
    const all = await chrome.storage.local.get(null);
    const pages = {};
    for (const [k, v] of Object.entries(all)) if (k.startsWith('page:')) pages[k] = v;
    return pages;
  },

  async collectBackup() {
    return {
      app: 'note-o-web',
      version: 1,
      exportedAt: new Date().toISOString(),
      pages: await NOW.allPages()
    };
  },

  sanitizePage(p) {
    const str = (v) => (typeof v === 'string' ? v : '');
    const highlights = (Array.isArray(p?.highlights) ? p.highlights : [])
      .filter((h) => h && typeof h.id === 'string' && typeof h.exact === 'string' && h.exact)
      .map((h) => ({
        id: h.id, type: str(h.type), exact: h.exact, prefix: str(h.prefix), suffix: str(h.suffix),
        note: str(h.note), created: Number(h.created) || Date.now()
      }));
    const postits = (Array.isArray(p?.postits) ? p.postits : [])
      .filter((x) => x && typeof x.id === 'string')
      .map((x) => ({
        id: x.id, color: str(x.color), text: str(x.text),
        x: Number(x.x) || 100, y: Number(x.y) || 100, w: Number(x.w) || 200, h: Number(x.h) || 160,
        created: Number(x.created) || Date.now()
      }));
    return { highlights, postits };
  },

  mergeById(oldList, newList) {
    const map = new Map(oldList.map((x) => [x.id, x]));
    for (const x of newList) map.set(x.id, x);
    return [...map.values()];
  },

  // mode: 'merge' (Standard) oder 'replace'. Gibt die Anzahl wiederhergestellter Seiten zurück.
  async applyBackup(backup, mode) {
    if (backup?.app !== 'note-o-web' || typeof backup.pages !== 'object' || !backup.pages) {
      throw new Error('Das ist keine Note-o-Web-Sicherung.');
    }
    const existing = await NOW.allPages();
    if (mode === 'replace') await chrome.storage.local.remove(Object.keys(existing));
    const toWrite = {};
    let count = 0;
    for (const [key, page] of Object.entries(backup.pages)) {
      if (!key.startsWith('page:')) continue;
      const clean = NOW.sanitizePage(page);
      if (!clean.highlights.length && !clean.postits.length) continue;
      const old = mode === 'merge' && existing[key] ? NOW.sanitizePage(existing[key]) : { highlights: [], postits: [] };
      toWrite[key] = {
        highlights: NOW.mergeById(old.highlights, clean.highlights),
        postits: NOW.mergeById(old.postits, clean.postits)
      };
      count++;
    }
    await chrome.storage.local.set(toWrite);
    return count;
  }
};
