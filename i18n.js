// Eigenes Übersetzungssystem (EN/DE). Die Sprache ist in den Optionen wählbar und liegt unter 'cfg:lang'
// ('auto' | 'en' | 'de'). Alle Texte hier sind statisch und vertrauenswürdig (daher innerHTML bei data-i18n-html).
(() => {
  const STR = {
    en: {
      'tb.copy': 'Copy', 'tb.search': 'Search', 'tb.translate': 'Translate', 'tb.summarize': 'Summarize',
      'tb.highlight': 'Highlight', 'tb.postit': 'Sticky note',
      'type.comment': 'Comment', 'type.important': 'Important', 'type.alert': 'Alert',
      'type.question': 'Question', 'type.idea': 'Idea',
      'color.yellow': 'Yellow', 'color.pink': 'Pink', 'color.blue': 'Blue',
      'color.green': 'Green', 'color.orange': 'Orange', 'color.purple': 'Purple',
      'toast.copied': 'Copied to clipboard', 'toast.copiedShort': 'Copied',
      'toast.noHighlight': 'The selection could not be highlighted',
      'fly.notePh': 'Add a note …', 'fly.delete': 'Delete highlight',
      'sum.title': 'Summary (local)', 'sum.asPostit': 'As sticky note',
      'sum.tooShort': 'The selected text is too short to summarize. Please select more text (at least three sentences).',
      'pi.notePh': 'Note …', 'pi.delete': 'Delete sticky note', 'pi.confirmDelete': 'Delete this sticky note?',

      'pop.na': 'Not available on this page (http/https pages only).',
      'pop.newPostit': 'New sticky note', 'pop.onPage': 'On this page',
      'pop.empty': 'Nothing yet. Select text to get started.',
      'pop.options': 'Backup, download & restore …', 'pop.emptyPostit': '(empty)', 'pop.postitSub': 'Sticky note',

      'opt.title': 'Note-o-Web – Options',
      'opt.tagline': 'All data lives locally in your browser. There is no server.',
      'opt.language': 'Language', 'opt.langAuto': 'Automatic (browser language)',
      'opt.overview': 'Overview', 'opt.pages': 'Pages', 'opt.highlights': 'Highlights',
      'opt.postits': 'Sticky notes', 'opt.storage': 'Storage',
      'opt.backupTitle': 'Backup & restore', 'opt.download': '⬇ Download backup (JSON)',
      'opt.merge': 'Merge', 'opt.replace': 'Replace all', 'opt.restore': '⬆ Restore',
      'opt.cloudTitle': 'Automatic cloud backup',
      'opt.cloudIntro': 'A backup runs by itself about a minute after every change, no button to press. The file is stored in a private app folder of your cloud account. No server of ours is involved. Pick the active provider with the radio button.',
      'opt.backupNow': '☁ Back up now', 'opt.cloudRestore': '☁ Restore from cloud',
      'opt.modeHint': '(mode: see above, merge / replace all)',
      'opt.regData': 'Data for the app registration', 'opt.redirect': 'Redirect URL:', 'opt.extId': 'Extension ID:',
      'opt.guide': 'Step by step guide: file <code>CLOUD-SETUP.md</code> in the project folder.',
      'opt.notes': 'Notes',
      'opt.shortcut': 'Create a new sticky note with a shortcut, suggested <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Y</kbd>. You can change it at <b>chrome://extensions/shortcuts</b> (type the address into the address bar, extensions cannot link there).',
      'opt.wipe': 'Delete all notes …',

      'msg.exported': 'Backup downloaded.', 'msg.pickFile': 'Please choose a backup file first.',
      'msg.badJson': 'The file is not valid JSON.',
      'msg.confirmReplace': 'All existing notes will be replaced by the backup. Continue?',
      'msg.confirmWipe': 'Really delete ALL highlights and sticky notes? This can only be undone with a backup.',
      'msg.wiped': 'All notes deleted.', 'msg.restored': '{n} page(s) restored.',
      'msg.restoredCloud': '{n} page(s) restored from the cloud.',
      'msg.disconnected': '{name} disconnected.',
      'msg.connectedRunning': '{name} connected. First backup running …',
      'msg.connectedDone': '{name} connected and first backup created.',
      'msg.cloudSaved': 'Backup saved to the cloud.',
      'prov.connected': 'connected', 'prov.notConnected': 'not connected',
      'prov.connect': 'Connect', 'prov.disconnect': 'Disconnect', 'prov.clientId': 'Client ID / app key',
      'st.active': 'Active provider: {name}', 'st.none': 'No active provider, nothing is backed up automatically.',
      'st.last': 'Last backup: {time}', 'st.error': 'Last error: {err}',

      'err.notBackup': 'This is not a Note-o-Web backup.',
      'err.cancelled': 'Sign-in cancelled.', 'err.badState': 'Invalid response (state).',
      'err.needClientId': 'Please enter the client ID first.',
      'err.noRefresh': 'No refresh token received (check the app settings).',
      'err.notConnected': 'Not connected.', 'err.noBackup': 'There is no backup in {name} yet.',
      'err.tooBig': 'The backup is larger than 60 MB.',
      'err.googleClientMissing': 'Google client ID missing: enter it in manifest.json under oauth2.client_id (see CLOUD-SETUP.md).',
      'err.noGoogleToken': 'No Google token received.', 'err.noProvider': 'No cloud provider connected.'
    },
    de: {
      'tb.copy': 'Kopieren', 'tb.search': 'Suchen', 'tb.translate': 'Übersetzen', 'tb.summarize': 'Zusammenfassen',
      'tb.highlight': 'Markieren', 'tb.postit': 'Post-it',
      'type.comment': 'Kommentar', 'type.important': 'Wichtig', 'type.alert': 'Achtung',
      'type.question': 'Frage', 'type.idea': 'Idee',
      'color.yellow': 'Gelb', 'color.pink': 'Rosa', 'color.blue': 'Blau',
      'color.green': 'Grün', 'color.orange': 'Orange', 'color.purple': 'Lila',
      'toast.copied': 'In Zwischenablage kopiert', 'toast.copiedShort': 'Kopiert',
      'toast.noHighlight': 'Auswahl konnte nicht markiert werden',
      'fly.notePh': 'Notiz hinzufügen …', 'fly.delete': 'Markierung löschen',
      'sum.title': 'Kurzfassung (lokal)', 'sum.asPostit': 'Als Post-it',
      'sum.tooShort': 'Der markierte Text ist zu kurz für eine Zusammenfassung. Bitte mehr Text markieren (mindestens drei Sätze).',
      'pi.notePh': 'Notiz …', 'pi.delete': 'Post-it löschen', 'pi.confirmDelete': 'Dieses Post-it löschen?',

      'pop.na': 'Auf dieser Seite nicht verfügbar (nur http/https-Seiten).',
      'pop.newPostit': 'Neues Post-it', 'pop.onPage': 'Auf dieser Seite',
      'pop.empty': 'Noch nichts. Text markieren, um zu starten.',
      'pop.options': 'Backup, Download & Restore …', 'pop.emptyPostit': '(leer)', 'pop.postitSub': 'Post-it',

      'opt.title': 'Note-o-Web – Optionen',
      'opt.tagline': 'Alle Daten liegen lokal in deinem Browser. Es gibt keinen Server.',
      'opt.language': 'Sprache', 'opt.langAuto': 'Automatisch (Browsersprache)',
      'opt.overview': 'Übersicht', 'opt.pages': 'Seiten', 'opt.highlights': 'Markierungen',
      'opt.postits': 'Post-its', 'opt.storage': 'Speicher',
      'opt.backupTitle': 'Sichern & Wiederherstellen', 'opt.download': '⬇ Backup herunterladen (JSON)',
      'opt.merge': 'Zusammenführen', 'opt.replace': 'Alles ersetzen', 'opt.restore': '⬆ Wiederherstellen',
      'opt.cloudTitle': 'Automatisches Cloud-Backup',
      'opt.cloudIntro': 'Etwa eine Minute nach jeder Änderung wird automatisch gesichert, ohne dass du etwas drücken musst. Die Datei liegt in einem privaten App-Ordner deines Cloud-Kontos. Es ist kein Server von uns beteiligt. Wähle den aktiven Anbieter per Auswahlkreis.',
      'opt.backupNow': '☁ Jetzt sichern', 'opt.cloudRestore': '☁ Aus Cloud wiederherstellen',
      'opt.modeHint': '(Modus siehe oben: Zusammenführen / Alles ersetzen)',
      'opt.regData': 'Daten für die App-Registrierung', 'opt.redirect': 'Redirect-URL:', 'opt.extId': 'Extension-ID:',
      'opt.guide': 'Schritt-für-Schritt-Anleitung: Datei <code>CLOUD-SETUP.md</code> im Projektordner.',
      'opt.notes': 'Hinweise',
      'opt.shortcut': 'Neues Post-it per Tastenkürzel, Vorschlag <kbd>Strg</kbd>+<kbd>Shift</kbd>+<kbd>Y</kbd>. Das Kürzel lässt sich unter <b>chrome://extensions/shortcuts</b> frei ändern (Adresse dort in die Adresszeile eingeben, Links dorthin sind aus Erweiterungen heraus gesperrt).',
      'opt.wipe': 'Alle Notizen löschen …',

      'msg.exported': 'Backup wurde heruntergeladen.', 'msg.pickFile': 'Bitte zuerst eine Backup-Datei auswählen.',
      'msg.badJson': 'Datei ist kein gültiges JSON.',
      'msg.confirmReplace': 'Alle vorhandenen Notizen werden durch das Backup ersetzt. Fortfahren?',
      'msg.confirmWipe': 'Wirklich ALLE Markierungen und Post-its löschen? Das lässt sich nur mit einem Backup rückgängig machen.',
      'msg.wiped': 'Alle Notizen wurden gelöscht.', 'msg.restored': '{n} Seite(n) wiederhergestellt.',
      'msg.restoredCloud': '{n} Seite(n) aus der Cloud wiederhergestellt.',
      'msg.disconnected': '{name} getrennt.',
      'msg.connectedRunning': '{name} verbunden. Erstes Backup läuft …',
      'msg.connectedDone': '{name} verbunden und erstes Backup erstellt.',
      'msg.cloudSaved': 'Backup in der Cloud gespeichert.',
      'prov.connected': 'verbunden', 'prov.notConnected': 'nicht verbunden',
      'prov.connect': 'Verbinden', 'prov.disconnect': 'Trennen', 'prov.clientId': 'Client-ID / App-Key',
      'st.active': 'Aktiver Anbieter: {name}', 'st.none': 'Kein aktiver Anbieter, es wird nicht automatisch gesichert.',
      'st.last': 'Letztes Backup: {time}', 'st.error': 'Letzter Fehler: {err}',

      'err.notBackup': 'Das ist keine Note-o-Web-Sicherung.',
      'err.cancelled': 'Anmeldung abgebrochen.', 'err.badState': 'Ungültige Antwort (state).',
      'err.needClientId': 'Bitte zuerst die Client-ID eintragen.',
      'err.noRefresh': 'Kein Refresh-Token erhalten (App-Einstellungen prüfen).',
      'err.notConnected': 'Nicht verbunden.', 'err.noBackup': 'In {name} liegt noch kein Backup.',
      'err.tooBig': 'Backup ist größer als 60 MB.',
      'err.googleClientMissing': 'Google-Client-ID fehlt: bitte in manifest.json unter oauth2.client_id eintragen (siehe CLOUD-SETUP.md).',
      'err.noGoogleToken': 'Kein Google-Token erhalten.', 'err.noProvider': 'Kein Cloud-Anbieter verbunden.'
    }
  };

  const detect = () => (((globalThis.navigator && navigator.language) || 'en').toLowerCase().startsWith('de') ? 'de' : 'en');
  const apply = (pref) => {
    NOW.langPref = pref === 'en' || pref === 'de' ? pref : 'auto';
    NOW.lang = NOW.langPref === 'auto' ? detect() : NOW.langPref;
  };
  apply('auto');

  NOW.t = (key, vars) => {
    let s = STR[NOW.lang]?.[key] ?? STR.en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.split('{' + k + '}').join(v);
    return s;
  };
  NOW.typeLabel = (k) => NOW.t('type.' + k);
  NOW.colorLabel = (k) => NOW.t('color.' + k);

  NOW.loadLang = async () => {
    try { apply((await chrome.storage.local.get('cfg:lang'))['cfg:lang']); } catch (e) { /* Standard bleibt */ }
  };
  NOW.setLang = (pref) => chrome.storage.local.set({ 'cfg:lang': pref });
  NOW.onLangChange = (cb) => {
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes['cfg:lang']) { apply(changes['cfg:lang'].newValue); cb(); }
      });
    } catch (e) { /* Extension neu geladen */ }
  };

  // data-i18n="key" (Text), data-icon (Emoji-Präfix), data-i18n-html, data-i18n-title, data-i18n-ph
  NOW.applyDom = (rootEl) => {
    rootEl.querySelectorAll('[data-i18n]').forEach((n) => {
      const text = NOW.t(n.dataset.i18n);
      if (n.hasAttribute('data-i18n-html')) n.innerHTML = text;
      else n.textContent = (n.dataset.icon ? n.dataset.icon + ' ' : '') + text;
    });
    rootEl.querySelectorAll('[data-i18n-title]').forEach((n) => { n.title = NOW.t(n.dataset.i18nTitle); });
    rootEl.querySelectorAll('[data-i18n-ph]').forEach((n) => { n.placeholder = NOW.t(n.dataset.i18nPh); });
    if (rootEl === document) document.documentElement.lang = NOW.lang;
  };
})();
