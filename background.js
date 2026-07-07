// Volume Booster Background Service Worker
// by Ayush Acharya — ayushacharya5.com.np

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ volume: 100, isActive: true });
  console.log('[Volume Booster] Installed — ayushacharya5.com.np');
});

// Re-inject content script on tab updates (for SPAs etc.)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
    chrome.storage.local.get(['volume', 'isActive'], (data) => {
      const volume = data.volume ?? 100;
      const isActive = data.isActive ?? true;
      chrome.tabs.sendMessage(tabId, {
        action: 'setVolume',
        volume: volume / 100,
        enabled: isActive
      }).catch(() => {
        // Tab may not have content script yet — that's fine
      });
    });
  }
});
