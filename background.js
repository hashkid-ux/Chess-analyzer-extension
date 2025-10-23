// background.js - MUST HAVE THIS CODE
// Background Service Worker
console.log('🎯 Chess Analyzer Extension: Background script loaded');

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('✅ Extension installed');
    chrome.storage.sync.set({
      enabled: true,
      autoStart: true,
      defaultEngine: 'stockfish',
      defaultMode: 'blitz',
      autoMoveEnabled: false,
      moveSpeed: 'normal'
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveSettings') {
    chrome.storage.sync.set(request.settings, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'getSettings') {
    chrome.storage.sync.get(null, (settings) => {
      sendResponse({ success: true, settings });
    });
    return true;
  }
});

console.log('✅ Background script initialized');
