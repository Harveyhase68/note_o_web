// Cloud-Backup: Dropbox, Google Drive, OneDrive. Kein eigener Server, OAuth direkt aus der Extension.
// Läuft im Service Worker (importScripts) und auf der Optionsseite (script-Tag).
globalThis.NOWBackup = (() => {
  const CFG_KEY = 'cfg:backup';      // kein "page:"-Präfix, landet also nie im Backup
  const FILE = 'note-o-web-backup.json';

  // ---- Konfiguration / Status --------------------------------------------
  async function getCfg() {
    const r = await chrome.storage.local.get(CFG_KEY);
    return r[CFG_KEY] || {};
  }
  async function setCfg(patch) {
    const c = { ...(await getCfg()), ...patch };
    await chrome.storage.local.set({ [CFG_KEY]: c });
    return c;
  }
  async function setTokens(id, t) {
    const c = await getCfg();
    const tokens = { ...(c.tokens || {}) };
    if (t) tokens[id] = t; else delete tokens[id];
    await setCfg({ tokens });
  }

  // ---- Helfer ---------------------------------------------------------------
  const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const rand = () => b64url(crypto.getRandomValues(new Uint8Array(16)));

  async function pkce() {
    const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
    const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    return { verifier, challenge };
  }

  async function check(r) {
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      throw new Error(`HTTP ${r.status} ${t.slice(0, 200)}`);
    }
    return r;
  }

  async function authorize(authBase, params) {
    const { verifier, challenge } = await pkce();
    const state = rand();
    const redirect = chrome.identity.getRedirectURL();
    const url = authBase + '?' + new URLSearchParams({
      ...params, redirect_uri: redirect, response_type: 'code',
      code_challenge: challenge, code_challenge_method: 'S256', state
    });
    const resp = await chrome.identity.launchWebAuthFlow({ url, interactive: true });
    if (!resp) throw new Error('Anmeldung abgebrochen.');
    const u = new URL(resp);
    const err = u.searchParams.get('error');
    if (err) throw new Error(u.searchParams.get('error_description') || err);
    if (u.searchParams.get('state') !== state) throw new Error('Ungültige Antwort (state).');
    return { code: u.searchParams.get('code'), verifier, redirect };
  }

  async function tokenRequest(url, form) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(form)
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error_description || j.error || 'HTTP ' + r.status);
    return j;
  }

  async function connectOAuth(id, { authUrl, tokenUrl, clientIdKey, authExtra = {}, tokenExtra = {} }) {
    const cid = (await getCfg())[clientIdKey];
    if (!cid) throw new Error('Bitte zuerst die Client-ID eintragen.');
    const { code, verifier, redirect } = await authorize(authUrl, { client_id: cid, ...authExtra });
    const j = await tokenRequest(tokenUrl, {
      grant_type: 'authorization_code', code, redirect_uri: redirect,
      client_id: cid, code_verifier: verifier, ...tokenExtra
    });
    if (!j.refresh_token) throw new Error('Kein Refresh-Token erhalten (App-Einstellungen prüfen).');
    await setTokens(id, { access: j.access_token, refresh: j.refresh_token, exp: Date.now() + (j.expires_in || 3600) * 1000 });
  }

  async function accessToken(id, { tokenUrl, clientIdKey, tokenExtra = {} }) {
    const cfg = await getCfg();
    const t = cfg.tokens?.[id];
    if (!t) throw new Error('Nicht verbunden.');
    if (t.access && t.exp > Date.now() + 60000) return t.access;
    const j = await tokenRequest(tokenUrl, {
      grant_type: 'refresh_token', refresh_token: t.refresh, client_id: cfg[clientIdKey], ...tokenExtra
    });
    const nt = { access: j.access_token, refresh: j.refresh_token || t.refresh, exp: Date.now() + (j.expires_in || 3600) * 1000 };
    await setTokens(id, nt);
    return nt.access;
  }

  // ---- Dropbox (App-Ordner) -------------------------------------------------
  const DBX = {
    authUrl: 'https://www.dropbox.com/oauth2/authorize',
    tokenUrl: 'https://api.dropboxapi.com/oauth2/token',
    clientIdKey: 'dropboxClientId',
    authExtra: { token_access_type: 'offline' }
  };
  const dropbox = {
    label: 'Dropbox',
    needsClientId: true,
    isConnected: (cfg) => !!cfg.tokens?.dropbox,
    connect: () => connectOAuth('dropbox', DBX),
    disconnect: () => setTokens('dropbox', null),
    async upload(json) {
      const tok = await accessToken('dropbox', DBX);
      await check(await fetch('https://content.dropboxapi.com/2/files/upload', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + tok,
          'Dropbox-API-Arg': JSON.stringify({ path: '/' + FILE, mode: 'overwrite', mute: true }),
          'Content-Type': 'application/octet-stream'
        },
        body: json
      }));
    },
    async download() {
      const tok = await accessToken('dropbox', DBX);
      const r = await fetch('https://content.dropboxapi.com/2/files/download', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + tok, 'Dropbox-API-Arg': JSON.stringify({ path: '/' + FILE }) }
      });
      if (r.status === 409) throw new Error('In Dropbox liegt noch kein Backup.');
      return (await check(r)).text();
    }
  };

  // ---- OneDrive (App-Ordner) --------------------------------------------------
  const OD_SCOPE = 'Files.ReadWrite.AppFolder offline_access';
  const OD = {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    clientIdKey: 'onedriveClientId',
    authExtra: { scope: OD_SCOPE, response_mode: 'query' },
    tokenExtra: { scope: OD_SCOPE }
  };
  const ODBASE = `https://graph.microsoft.com/v1.0/me/drive/special/approot:/${FILE}:`;
  const onedrive = {
    label: 'OneDrive',
    needsClientId: true,
    isConnected: (cfg) => !!cfg.tokens?.onedrive,
    connect: () => connectOAuth('onedrive', OD),
    disconnect: () => setTokens('onedrive', null),
    async upload(json) {
      const tok = await accessToken('onedrive', OD);
      const bytes = new TextEncoder().encode(json);
      if (bytes.length <= 3.5 * 1024 * 1024) {
        await check(await fetch(ODBASE + '/content', {
          method: 'PUT', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: bytes
        }));
        return;
      }
      if (bytes.length > 60 * 1024 * 1024) throw new Error('Backup ist größer als 60 MB.');
      const s = await (await check(await fetch(ODBASE + '/createUploadSession', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: { '@microsoft.graph.conflictBehavior': 'replace' } })
      }))).json();
      await check(await fetch(s.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Range': `bytes 0-${bytes.length - 1}/${bytes.length}` },
        body: bytes
      }));
    },
    async download() {
      const tok = await accessToken('onedrive', OD);
      const r = await fetch(ODBASE + '/content', { headers: { Authorization: 'Bearer ' + tok } });
      if (r.status === 404) throw new Error('In OneDrive liegt noch kein Backup.');
      return (await check(r)).text();
    }
  };

  // ---- Google Drive (appDataFolder, Anmeldung über das Chrome-Profil) -----
  const gToken = async (interactive) => {
    const r = await chrome.identity.getAuthToken({ interactive });
    const t = typeof r === 'string' ? r : r?.token;
    if (!t) throw new Error('Kein Google-Token erhalten.');
    return t;
  };
  async function gFetch(url, opts = {}, retry = true) {
    const token = await gToken(false);
    const r = await fetch(url, { ...opts, headers: { ...(opts.headers || {}), Authorization: 'Bearer ' + token } });
    if (r.status === 401 && retry) {
      await chrome.identity.removeCachedAuthToken({ token });
      return gFetch(url, opts, false);
    }
    return r;
  }
  async function gFindId() {
    const q = encodeURIComponent(`name='${FILE}' and 'appDataFolder' in parents and trashed=false`);
    const r = await check(await gFetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id)`));
    return (await r.json()).files?.[0]?.id || null;
  }
  const google = {
    label: 'Google Drive',
    needsClientId: false,
    isConnected: (cfg) => !!cfg.google?.connected,
    async connect() {
      if ((chrome.runtime.getManifest().oauth2?.client_id || '').includes('DEINE_')) {
        throw new Error('Google-Client-ID fehlt: bitte in manifest.json unter oauth2.client_id eintragen (siehe CLOUD-SETUP.md).');
      }
      await gToken(true);
      await setCfg({ google: { connected: true } });
    },
    async disconnect() {
      try {
        const token = await gToken(false);
        await chrome.identity.removeCachedAuthToken({ token });
        await fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(token), { method: 'POST' });
      } catch (e) { /* war evtl. schon getrennt */ }
      await setCfg({ google: { connected: false } });
    },
    async upload(json) {
      const id = await gFindId();
      if (id) {
        await check(await gFetch(`https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: json
        }));
        return;
      }
      const boundary = 'nowb' + rand();
      const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
        JSON.stringify({ name: FILE, parents: ['appDataFolder'] }) +
        `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${json}\r\n--${boundary}--`;
      await check(await gFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + boundary }, body
      }));
    },
    async download() {
      const id = await gFindId();
      if (!id) throw new Error('In Google Drive liegt noch kein Backup.');
      return (await check(await gFetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`))).text();
    }
  };

  const PROVIDERS = { dropbox, google, onedrive };

  // ---- Aktionen ---------------------------------------------------------------
  let inflight = null;
  function runBackup() {
    if (inflight) return inflight;
    inflight = (async () => {
      const cfg = await getCfg();
      const prov = PROVIDERS[cfg.provider];
      if (!prov || !prov.isConnected(cfg)) return { skipped: true };
      try {
        await prov.upload(JSON.stringify(await NOW.collectBackup()));
        await setCfg({ lastBackup: Date.now(), lastError: null });
        return { ok: true };
      } catch (e) {
        await setCfg({ lastError: String(e.message || e) });
        throw e;
      }
    })().finally(() => { inflight = null; });
    return inflight;
  }

  async function restoreFromCloud(mode) {
    const cfg = await getCfg();
    const prov = PROVIDERS[cfg.provider];
    if (!prov || !prov.isConnected(cfg)) throw new Error('Kein Cloud-Anbieter verbunden.');
    return NOW.applyBackup(JSON.parse(await prov.download()), mode);
  }

  return { PROVIDERS, getCfg, setCfg, runBackup, restoreFromCloud };
})();
