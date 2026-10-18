const $ = (id) => document.getElementById(id);
const t = (k, v) => NOW.t(k, v);

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
const confirmReplace = () => restoreMode() !== 'replace' || confirm(t('msg.confirmReplace'));

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
  say(t('msg.exported'));
});

// ---- Datei-Restore ------------------------------------------------------
$('btnRestore').addEventListener('click', async () => {
  const file = $('file').files[0];
  if (!file) return say(t('msg.pickFile'), false);
  let backup;
  try {
    backup = JSON.parse(await file.text());
  } catch (e) {
    return say(t('msg.badJson'), false);
  }
  if (!confirmReplace()) return;
  try {
    const n = await NOW.applyBackup(backup, restoreMode());
    say(t('msg.restored', { n }));
    refreshStats();
  } catch (e) {
    say(e.message, false);
  }
});

// ---- Alles löschen ------------------------------------------------------
$('btnWipe').addEventListener('click', async () => {
  if (!confirm(t('msg.confirmWipe'))) return;
  await chrome.storage.local.remove(Object.keys(await NOW.allPages()));
  say(t('msg.wiped'));
  refreshStats();
});

// ---- Cloud-Backup -------------------------------------------------------
$('redir').textContent = chrome.identity.getRedirectURL();
$('extid').textContent = chrome.runtime.id;

async function renderStatus() {
  const cfg = await NOWBackup.getCfg();
  const prov = NOWBackup.PROVIDERS[cfg.provider];
  const parts = [prov ? t('st.active', { name: prov.label }) : t('st.none')];
  if (cfg.lastBackup) {
    parts.push(t('st.last', { time: new Date(cfg.lastBackup).toLocaleString(NOW.lang === 'de' ? 'de-DE' : 'en-GB') }));
  }
  if (cfg.lastError) parts.push(t('st.error', { err: cfg.lastError }));
  $('cstatus').textContent = parts.join(' · ');
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
    badge.textContent = connected ? t('prov.connected') : t('prov.notConnected');

    row.append(radio, name, badge);

    if (prov.needsClientId) {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = t('prov.clientId');
      input.value = cfg[id + 'ClientId'] || '';
      input.addEventListener('change', () => NOWBackup.setCfg({ [id + 'ClientId']: input.value.trim() }));
      row.append(input);
    }

    const btn = document.createElement('button');
    btn.textContent = connected ? t('prov.disconnect') : t('prov.connect');
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        if (connected) {
          await prov.disconnect();
          const c = await NOWBackup.getCfg();
          if (c.provider === id) await NOWBackup.setCfg({ provider: null });
          say(t('msg.disconnected', { name: prov.label }), true, 'cmsg');
        } else {
          const typed = row.querySelector('input[type=text]');
          if (typed) await NOWBackup.setCfg({ [id + 'ClientId']: typed.value.trim() });
          await prov.connect();
          await NOWBackup.setCfg({ provider: id });
          say(t('msg.connectedRunning', { name: prov.label }), true, 'cmsg');
          await NOWBackup.runBackup();
          say(t('msg.connectedDone', { name: prov.label }), true, 'cmsg');
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
    say(t('msg.cloudSaved'), true, 'cmsg');
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
    say(t('msg.restoredCloud', { n }), true, 'cmsg');
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

// ---- Sprache --------------------------------------------------------------
function applyLanguage() {
  NOW.applyDom(document);
  document.title = t('opt.title');
  $('lang').value = NOW.langPref;
}
$('lang').addEventListener('change', () => NOW.setLang($('lang').value));
NOW.onLangChange(() => {
  applyLanguage();
  $('msg').textContent = '';
  $('cmsg').textContent = '';
  renderProviders();
  renderStatus();
});

(async () => {
  await NOW.loadLang();
  applyLanguage();
  refreshStats();
  renderProviders();
  renderStatus();
})();
