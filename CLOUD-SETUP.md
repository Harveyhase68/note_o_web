# Setting up cloud backup

🇩🇪 Deutsche Version: [CLOUD-SETUP.de.md](CLOUD-SETUP.de.md)

Each provider needs a one-time, free app registration so your account can authorize the extension.
Only a private app folder is used, never your whole storage.

On the extension's options page, under **Data for the app registration**, you find the **redirect URL**
(`https://<extension-id>.chromiumapp.org/`) and the **extension ID**. You need both below.

> When you load the extension from a folder, its ID depends on the folder path. If you move
> `note_o_web`, the ID changes and the registrations have to be updated.

## Dropbox
1. https://www.dropbox.com/developers/apps → **Create app**
2. Choose **Scoped access** → **App folder** → pick a name (e.g. `Note-o-Web`)
3. Tab **Permissions**: tick `files.content.write` and `files.content.read`, then click **Submit**
   (the Submit bar sometimes only appears after reloading the page)
4. Tab **Settings** → **Redirect URIs**: enter the redirect URL → **Add**
5. Copy the **App key**, paste it into the Dropbox field on the options page → **Connect**

You do not need the app secret. The extension uses OAuth with PKCE, which works without it.
If you change permissions later, **Disconnect** and **Connect** again so the new token gets the new rights.

## OneDrive (Microsoft)
1. https://entra.microsoft.com → **App registrations** → **New registration**
2. Pick a name. **Supported account types**: *Accounts in any organizational directory and personal Microsoft accounts*
3. **Redirect URI**: platform **Mobile and desktop applications** (public client), URL = the redirect URL → **Register**
4. Menu **Authentication** → set **Allow public client flows** to **Yes** → save
5. Menu **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated**:
   `Files.ReadWrite.AppFolder` and `offline_access`
6. Copy the **Application (client) ID** from the overview page, paste it into the OneDrive field → **Connect**

## Google Drive
Google uses the Chrome profile you are signed into (no password inside the extension).
1. https://console.cloud.google.com → new project
2. **APIs & Services → Library** → enable the **Google Drive API**
3. **OAuth consent screen**: *External*, pick a name, add yourself as a **test user**,
   add the scope `.../auth/drive.appdata`
4. **Credentials → Create credentials → OAuth client ID** → type **Chrome extension**,
   **Item ID** = your extension ID
5. Put the client ID into `manifest.json` under `oauth2.client_id` (replace `DEINE_GOOGLE_CLIENT_ID…`)
6. Reload the extension at `chrome://extensions` → options page → Google Drive → **Connect**

## Notes
- Backups run automatically a minute after your last change. On errors (e.g. offline) it retries after 10 minutes.
- Access tokens are kept in the extension's local storage and are not part of a backup. **Disconnect** removes them.
- Google Drive only works reliably in Chrome, not in Edge or Brave.
- In Google's "Testing" mode, sign-in keeps working for listed test users. You only need to verify the app if other people should use it.
