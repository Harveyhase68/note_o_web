# Cloud-Backup einrichten

Jeder Anbieter braucht einmalig eine eigene (kostenlose) App-Registrierung, damit dein Konto die Extension
autorisieren kann. Es wird nur ein privater App-Ordner genutzt, nie dein ganzer Speicher.

Auf der Optionsseite der Extension steht unter **Daten für die App-Registrierung** die **Redirect-URL**
(`https://<extension-id>.chromiumapp.org/`) und die **Extension-ID**. Beide brauchst du unten.

> Die Extension-ID hängt beim Laden aus einem Ordner vom Ordnerpfad ab. Verschiebst du
> `C:\wamp\www\note_o_web`, ändert sich die ID und die Registrierungen müssen angepasst werden.

## Dropbox
1. https://www.dropbox.com/developers/apps → **Create app**
2. **Scoped access** → **App folder** → Namen vergeben (z. B. `Note-o-Web`)
3. Reiter **Permissions**: `files.content.write` und `files.content.read` anhaken → **Submit**
4. Reiter **Settings** → **Redirect URIs**: die Redirect-URL eintragen → **Add**
5. **App key** kopieren und auf der Optionsseite bei Dropbox einfügen → **Verbinden**

## OneDrive (Microsoft)
1. https://entra.microsoft.com → **App registrations** → **New registration**
2. Name vergeben. **Supported account types**: *Accounts in any organizational directory and personal Microsoft accounts*
3. **Redirect URI**: Plattform **Mobile and desktop applications** (öffentlicher Client), URL = die Redirect-URL → **Register**
4. Menü **Authentication** → **Allow public client flows** auf **Yes** → Speichern
5. Menü **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated**:
   `Files.ReadWrite.AppFolder` und `offline_access`
6. **Application (client) ID** von der Übersichtsseite kopieren, auf der Optionsseite bei OneDrive einfügen → **Verbinden**

## Google Drive
Google nutzt das angemeldete Chrome-Profil (kein Passwort in der Extension).
1. https://console.cloud.google.com → neues Projekt
2. **APIs & Services → Library** → **Google Drive API** aktivieren
3. **OAuth consent screen**: *External*, Namen vergeben, dich selbst als **Test user** eintragen,
   Scope `.../auth/drive.appdata` hinzufügen
4. **Credentials → Create credentials → OAuth client ID** → Typ **Chrome extension**,
   **Item ID** = deine Extension-ID
5. Die Client-ID in `manifest.json` bei `oauth2.client_id` eintragen (ersetzt `DEINE_GOOGLE_CLIENT_ID…`)
6. Extension unter `chrome://extensions` neu laden → Optionsseite → Google Drive → **Verbinden**

## Hinweise
- Backup passiert automatisch eine Minute nach der letzten Änderung. Bei Fehlern (z. B. offline) wird nach 10 Minuten erneut versucht.
- Die Zugangs-Tokens liegen lokal im Extension-Speicher (nicht im Backup). **Trennen** entfernt sie wieder.
- Google Drive funktioniert nur in Chrome, bei Edge/Brave nicht zuverlässig.
- Im Google-Modus „Testing" läuft die Anmeldung für eingetragene Test-User dauerhaft; verifizieren musst du die App nur, wenn andere sie nutzen sollen.
