importScripts('shared.js', 'backup.js');

// Tastenkürzel: neues Post-it auf dem aktiven Tab.
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'new-postit') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id != null) {
    chrome.tabs.sendMessage(tab.id, { type: 'new-postit' }).catch(() => {});
  }
});

// Automatisches Backup: eine Minute nach der letzten Änderung (jede neue Änderung setzt den Timer zurück).
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (!Object.keys(changes).some((k) => k.startsWith('page:'))) return;
  chrome.alarms.create('backup-soon', { delayInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'backup-soon') return;
  try {
    await NOWBackup.runBackup();
  } catch (e) {
    // z. B. offline: in 10 Minuten erneut versuchen
    chrome.alarms.create('backup-soon', { delayInMinutes: 10 });
  }
});
