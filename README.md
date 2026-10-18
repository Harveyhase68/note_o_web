# 🗒 Note-o-Web

**Highlight text on any webpage, attach notes to it, and stick sticky notes anywhere on the page. Your notes stay in your browser, with optional automatic backup to your own Dropbox, Google Drive or OneDrive.**

No account, no tracking, no server of ours. Everything lives in your browser.

## Features

**Select text → instant toolbar**
- 📋 **Copy** · 🔍 **Search** · 🌐 **Translate**
- ✨ **Summarize**: a short local, extractive summary (no AI service, nothing leaves your machine)
- 🖍 **Highlight** in 5 types: 💬 Comment · ⭐ Important · ⚠️ Alert · ❓ Question · 💡 Idea
- 🗒 **Sticky note** from the selection

**Highlights with fly-outs**
- Hover or click a highlight to open a fly-out where you can write a note, change the type or delete it
- Highlights are re-anchored by text and surrounding context, so they survive page reloads and many layout changes
- Highlights with a note get a dotted underline

**Sticky notes**
- Free positioning, drag by the header, resizable
- 6 colors, switchable at any time
- Shortcut for a new note (suggested `Ctrl+Shift+Y`, changeable at `chrome://extensions/shortcuts`)

**Popup**
- Create a sticky note in any color
- List of everything on the current page, click to jump to it

**Languages**
- English and German, switchable on the options page (or automatic by browser language). The change applies instantly, also on open pages

## Backup & restore

Browsers get reset, so there are three ways to keep your notes safe:

| Method | How |
|---|---|
| **Download** | One click on the options page → `note-o-web-backup-YYYY-MM-DD.json` |
| **Restore** | Pick a backup file. *Merge* (default) keeps existing notes and adds the backup, *Replace* swaps everything |
| **Automatic cloud backup** | Choose **Dropbox**, **Google Drive** or **OneDrive**. A minute after your last change the backup runs by itself, no button to forget |

The cloud file lives in a private app folder of your own account, never your whole storage. There is also a **Restore from cloud** button.

> **Status:** Dropbox backup and restore are tested end to end. Google Drive and OneDrive are implemented the same way but have had less real-world testing. Feedback is welcome.

## Install (from source)

The extension is not in the Chrome Web Store yet.

1. Download or clone this repository
2. Open `chrome://extensions` and switch on **Developer mode**
3. Click **Load unpacked** and select the project folder
4. Pin the extension, open any `http(s)` page and select some text

Works in Chrome and other Chromium browsers (Edge, Brave, …). Google Drive backup needs Chrome.

## Set up cloud backup

Each provider needs a one-time, free app registration for your own account (the project ships no keys). See **[CLOUD-SETUP.md](CLOUD-SETUP.md)** ([Deutsch](CLOUD-SETUP.de.md)) for step-by-step instructions for Dropbox, OneDrive and Google Drive. The options page shows the redirect URL and extension ID you need for it.

## Privacy

- Notes are stored in `chrome.storage.local` inside your browser, not on any website and not on a server of ours
- The extension only talks to a cloud provider if you connect one, and only to upload or download your own backup file
- Access tokens stay in the extension's local storage and are never part of a backup. *Disconnect* removes them
- Search and Translate open Google in a new tab with your selected text, only when you click them

Permissions: `storage` and `unlimitedStorage` (your notes), `activeTab` (popup), `identity` (cloud sign-in), `alarms` (backup timing), plus host access to the three cloud APIs.

## Limitations

- Notes are saved per exact page URL (without `#hash`)
- Highlights inside iframes, PDFs, `chrome://` pages and editable fields (inputs, textareas) are not supported
- If a page changes its text a lot, a highlight may not find its place again; the stored note is not lost
- Summarize is a simple local heuristic, not an AI summary

## Project layout

```
manifest.json      Manifest V3
content.js         selection toolbar, highlights, fly-outs, sticky notes (Shadow DOM)
background.js      shortcut + backup timer (service worker)
backup.js          Dropbox / Google Drive / OneDrive (OAuth with PKCE, no secrets)
shared.js          constants, backup format, merge/restore logic
i18n.js            English / German texts and language switching
popup.*  options.* popup and options page
```

## Contributing

Issues and pull requests are welcome, especially for browser compatibility, Firefox support and more highlight types.

## License

[MIT](LICENSE) © 2026 Alexander Predl
