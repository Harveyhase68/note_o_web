const $ = (id) => document.getElementById(id);

function say(text, ok = true, target = 'msg') {
  const m = $(target);
  m.textContent = text;
  m.className = 'msg ' + (ok ? 'ok' : 'err');
}

async function refreshStats() {
  const pages = await NOW.allPages();
  let hl = 0, pi = 0;
  for (const p of Object.values(pages)) {
    hl += (p.highlights || []).length;
    pi += (p.postits || []).length;
  }
  $('sPages').textContent = Object.keys(pages).length;
  $('sHl').textContent = hl;
  $('sPi').textContent = pi;
  const bytes = await chrome.storage.local.getBytesInUse(null);
  $('sBytes').textContent = bytes < 1024 * 1024 ? (bytes / 1024).toFixed(1) + ' KB' : (bytes / 1048576).toFixed(2) + ' MB';
}

const restoreMode = () => document.querySelector('input[name=mode]:checked').value;
const confirmReplace = () => restoreMode() !== 'replace' ||
  confirm('Alle vorhandenen Notizen werden durch das Backup ersetzt. Fortfahren?');

// ---- Datei-Export -------------------------------------------------------
$('btnExport').addEventListener('click', async () => {
  const blob = new Blob([JSON.stringify(await NOW.collectBackup(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `note-o-web-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  say('Backup wurde heruntergeladen.');
});

// ---- Datei-Restore ------------------------------------------------------
$('btnRestore').addEventListener('click', async () => {
  const file = $('file').files[0];
  if (!file) return say('Bitte zuerst eine Backup-Datei auswählen.', false);
  let backup;
  try {
    backup = JSON.parse(await file.text());
  } catch (e) {
    return say('Datei ist kein gültiges JSON.', false);
  }
  if (!confirmReplace()) return;
  try {
    const n = await NOW.applyBackup(backup, restoreMode());
    say(`${n} Seite(n) wiederhergestellt.`);
    refreshStats();
  } catch (e) {
    say(e.message, false);
  }
});

// ---- Alles löschen ------------------------------------------------------
$('btnWipe').addEventListener('click', async () => {
  if (!confirm('Wirklich ALLE Markierungen und Post-its löschen? Das lässt sich nur mit einem Backup rückgängig machen.')) return;
  await chrome.storage.local.remove(Object.keys(await NOW.allPages()));
  say('Alle Notizen wurden gelöscht.');
  refreshStats();
});

// ---- Cloud-Backup -------------------------------------------------------
$('redir').textContent = chrome.identity.getRedirectURL();
$('extid').textContent = chrome.runtime.id;

async function renderStatus() {
  const cfg = await NOWBackup.getCfg();
  const prov = NOWBackup.PROVIDERS[cfg.provider];
  const parts = [];
  parts.push(prov ? `Aktiver Anbieter: ${prov.label}` : 'Kein aktiver Anbieter, es wird nicht automatisch gesichert.');
  if (cfg.lastBackup) parts.push('Letztes Backup: ' + new Date(cfg.lastBackup).toLocaleString('de-DE'));
  $('cstatus').textContent = parts.join(' · ') + (cfg.lastError ? ` · Letzter Fehler: ${cfg.lastError}` : '');
  $('btnNow').disabled = $('btnCloudRestore').disabled = !prov;
}

async function renderProviders() {
  const cfg = await NOWBackup.getCfg();
  const box = $('providers');
  box.textContent = '';
  for (const [id, prov] of Object.entries(NOWBackup.PROVIDERS)) {
    const connected = prov.isConnected(cfg);
    const row = document.createElement('div');
    row.className = 'prov';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'activeProv';
    radio.disabled = !connected;
    radio.checked = cfg.provider === id;
    radio.addEventListener('change', async () => { await NOWBackup.setCfg({ provider: id }); renderStatus(); });

    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = prov.label;

    const badge = document.createElement('span');
    badge.className = 'badge' + (connected ? ' on' : '');
    badge.textContent = connected ? 'verbunden' : 'nicht verbunden';

    row.append(radio, name, badge);

    if (prov.needsClientId) {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Client-ID / App-Key';
      input.value = cfg[id + 'ClientId'] || '';
      input.addEventListener('change', () => NOWBackup.setCfg({ [id + 'ClientId']: input.value.trim() }));
      row.append(input);
    }

    const btn = document.createElement('button');
    btn.textContent = connected ? 'Trennen' : 'Verbinden';
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        if (connected) {
          await prov.disconnect();
          const c = await NOWBackup.getCfg();
          if (c.provider === id) await NOWBackup.setCfg({ provider: null });
          say(`${prov.label} getrennt.`, true, 'cmsg');
        } else {
          const typed = row.querySelector('input[type=text]');
          if (typed) await NOWBackup.setCfg({ [id + 'ClientId']: typed.value.trim() });
          await prov.connect();
          await NOWBackup.setCfg({ provider: id });
          say(`${prov.label} verbunden. Erstes Backup läuft …`, true, 'cmsg');
          await NOWBackup.runBackup();
          say(`${prov.label} verbunden und erstes Backup erstellt.`, true, 'cmsg');
        }
      } catch (e) {
        say(e.message || String(e), false, 'cmsg');
      }
      await renderProviders();
      renderStatus();
    });
    row.append(btn);
    box.append(row);
  }
}

$('btnNow').addEventListener('click', async () => {
  $('btnNow').disabled = true;
  try {
    await NOWBackup.runBackup();
    say('Backup in der Cloud gespeichert.', true, 'cmsg');
  } catch (e) {
    say(e.message || String(e), false, 'cmsg');
  }
  renderStatus();
});

$('btnCloudRestore').addEventListener('click', async () => {
  if (!confirmReplace()) return;
  $('btnCloudRestore').disabled = true;
  try {
    const n = await NOWBackup.restoreFromCloud(restoreMode());
    say(`${n} Seite(n) aus der Cloud wiederhergestellt.`, true, 'cmsg');
    refreshStats();
  } catch (e) {
    say(e.message || String(e), false, 'cmsg');
  }
  renderStatus();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes['cfg:backup']) renderStatus();
  if (Object.keys(changes).some((k) => k.startsWith('page:'))) refreshStats();
});

refreshStats();
renderProviders();
renderStatus();
