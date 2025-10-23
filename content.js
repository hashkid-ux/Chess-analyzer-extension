// content.js - MUST HAVE THIS CODE
// Content Script - Injects analyzer into page
(function() {
  'use strict';

  console.log('🎯 Content script loaded');

  if (window.chessAnalyzerInjected) {
    console.log('⚠️ Already injected');
    return;
  }
  window.chessAnalyzerInjected = true;

  chrome.storage.sync.get({
    enabled: true,
    autoStart: true,
    defaultEngine: 'stockfish',
    defaultMode: 'blitz'
  }, (settings) => {
    console.log('📋 Settings:', settings);

    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('analyzer.js');
    script.onload = function() {
      console.log('✅ Analyzer injected');
      
      if (window.chessSmartAnalyzer && settings.defaultEngine !== 'stockfish') {
        setTimeout(() => window.chessSmartAnalyzer.setEngine(settings.defaultEngine), 500);
      }
      
      if (window.chessSmartAnalyzer && settings.defaultMode !== 'blitz') {
        setTimeout(() => window.chessSmartAnalyzer.setMode(settings.defaultMode), 700);
      }
      
      this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'ping') {
      sendResponse({ status: 'ready', injected: !!window.chessSmartAnalyzer });
      return true;
    }

    if (!window.chessSmartAnalyzer) {
      sendResponse({ error: 'Not loaded' });
      return true;
    }

    try {
      switch (request.action) {
        case 'analyze':
          window.chessSmartAnalyzer.analyze();
          sendResponse({ success: true });
          break;
        case 'setMode':
          window.chessSmartAnalyzer.setMode(request.mode);
          sendResponse({ success: true });
          break;
        case 'setEngine':
          window.chessSmartAnalyzer.setEngine(request.engine);
          sendResponse({ success: true });
          break;
        case 'setMoveSpeed':
          window.chessSmartAnalyzer.setMoveSpeed(request.speed);
          sendResponse({ success: true });
          break;
        case 'enableAutoMove':
          window.chessSmartAnalyzer.enableAutoMove();
          sendResponse({ success: true });
          break;
        case 'disableAutoMove':
          window.chessSmartAnalyzer.disableAutoMove();
          sendResponse({ success: true });
          break;
        case 'moveNow':
          window.chessSmartAnalyzer.moveNow();
          sendResponse({ success: true });
          break;
        case 'getStatus':
          sendResponse({ success: true, data: window.chessSmartAnalyzer.status() });
          break;
        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      sendResponse({ error: error.message });
    }

    return true;
  });

  console.log('✅ Content script ready');
})();
