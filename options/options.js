// Options Page Logic
(function() {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const $$ = (selector) => document.querySelectorAll(selector);

  // Default settings
  const DEFAULT_SETTINGS = {
    enabled: true,
    autoStart: true,
    autoDetectTime: true,
    visualFeedback: 'subtle',
    defaultEngine: 'stockfish',
    defaultMode: 'blitz',
    autoMoveEnabled: false,
    safetyMode: true,
    blockLiveGames: true,
    onlyMyTurn: true,
    humanize: true,
    minDelay: 0,
    maxDelay: 0.2,
    moveSpeed: 'normal',
    debounceMs: 100,
    minTimeBetween: 150,
    cacheSize: 100,
    overlayZIndex: 999999,
    debugMode: false,
    apiTimeout: 10,
    customEngineUrl: '',
    customEngineFormat: 'stockfish',
    customEngineDepth: 20,
    localEngineUrl: 'http://localhost:8080/analyze'
  };

  // Initialize page
  function init() {
    console.log('⚙️ Options page initializing...');
    
    setupTabs();
    loadSettings();
    setupEventListeners();
    
    console.log('✅ Options page ready');
  }

  // Setup tab navigation
  function setupTabs() {
    $$('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        
        // Update tab buttons
        $$('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Update content
        $$('.tab-content').forEach(content => content.classList.remove('active'));
        $(tabName).classList.add('active');
        
        console.log('📑 Switched to tab:', tabName);
      });
    });
  }

  // Load settings from storage
  async function loadSettings() {
    try {
      const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
      console.log('📋 Loaded settings:', settings);
      
      // Populate all form fields
      Object.keys(settings).forEach(key => {
        const element = $(key);
        if (!element) return;
        
        if (element.type === 'checkbox') {
          element.checked = settings[key];
        } else if (element.type === 'number') {
          element.value = settings[key];
        } else if (element.tagName === 'SELECT') {
          element.value = settings[key];
        } else {
          element.value = settings[key];
        }
      });
      
      showStatus('✅ Settings loaded', 'success');
    } catch (error) {
      console.error('❌ Error loading settings:', error);
      showStatus('❌ Failed to load settings', 'error');
    }
  }

  // Save settings to storage
  async function saveSettings() {
    try {
      const settings = {};
      
      // Collect all form values
      Object.keys(DEFAULT_SETTINGS).forEach(key => {
        const element = $(key);
        if (!element) return;
        
        if (element.type === 'checkbox') {
          settings[key] = element.checked;
        } else if (element.type === 'number') {
          settings[key] = parseFloat(element.value) || DEFAULT_SETTINGS[key];
        } else {
          settings[key] = element.value;
        }
      });
      
      await chrome.storage.sync.set(settings);
      console.log('💾 Settings saved:', settings);
      
      showStatus('✅ Settings saved successfully!', 'success');
      
      // Notify content scripts about settings update
      notifyContentScripts();
      
    } catch (error) {
      console.error('❌ Error saving settings:', error);
      showStatus('❌ Failed to save settings', 'error');
    }
  }

  // Notify all chess tabs about settings change
  async function notifyContentScripts() {
    try {
      const tabs = await chrome.tabs.query({});
      const chessTabs = tabs.filter(tab => 
        tab.url && (tab.url.includes('chess.com') || tab.url.includes('lichess.org'))
      );
      
      chessTabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { 
          action: 'settingsUpdated' 
        }).catch(() => {
          // Tab might not have content script yet
          console.log('Could not notify tab:', tab.id);
        });
      });
      
      console.log(`📢 Notified ${chessTabs.length} chess tabs`);
    } catch (error) {
      console.error('Error notifying tabs:', error);
    }
  }

  // Setup all event listeners
  function setupEventListeners() {
    // Save button
    $('saveBtn').addEventListener('click', saveSettings);

    // Clear cache button
    $('clearCacheBtn').addEventListener('click', async () => {
      if (confirm('Clear position cache? This will remove all cached analyses.')) {
        showStatus('🗑️ Cache cleared (restart extension)', 'success');
      }
    });

    // Reset settings button
    $('resetSettingsBtn').addEventListener('click', async () => {
      if (confirm('⚠️ Reset ALL settings to defaults? This cannot be undone!')) {
        await chrome.storage.sync.set(DEFAULT_SETTINGS);
        loadSettings();
        showStatus('🔄 Settings reset to defaults', 'success');
      }
    });

    // Reset stats button
    $('resetStatsBtn').addEventListener('click', async () => {
      if (confirm('⚠️ Reset all statistics? This cannot be undone!')) {
        await chrome.storage.sync.set({ 
          autoMovesCount: 0,
          totalAnalyses: 0 
        });
        showStatus('📊 Statistics reset', 'success');
      }
    });

    // Export settings
    $('exportBtn').addEventListener('click', exportSettings);

    // Import settings
    $('importBtn').addEventListener('click', () => {
      $('importFile').click();
    });

    $('importFile').addEventListener('change', importSettings);

    // Auto-save on critical changes
    const criticalFields = [
      'enabled', 'autoStart', 'safetyMode', 'blockLiveGames'
    ];
    
    criticalFields.forEach(fieldId => {
      const element = $(fieldId);
      if (element) {
        element.addEventListener('change', () => {
          console.log('🔄 Auto-saving critical setting:', fieldId);
          saveSettings();
        });
      }
    });

    // Validate number inputs
    $$('input[type="number"]').forEach(input => {
      input.addEventListener('input', () => {
        const min = parseFloat(input.min);
        const max = parseFloat(input.max);
        const value = parseFloat(input.value);
        
        if (value < min) input.value = min;
        if (value > max) input.value = max;
      });
    });

    // Show warning when enabling auto-move
    $('autoMoveEnabled').addEventListener('change', (e) => {
      if (e.target.checked) {
        if (!confirm('⚠️ WARNING: Auto-move is for LEARNING ONLY!\n\nUsing it in rated or live games violates fair play rules.\n\nDo you understand and accept this?')) {
          e.target.checked = false;
        }
      }
    });

    // Validate custom engine URL
    $('customEngineUrl').addEventListener('blur', (e) => {
      const url = e.target.value.trim();
      if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        alert('⚠️ Invalid URL! Must start with http:// or https://');
        e.target.value = '';
      }
    });
  }

  // Export settings to JSON file
  function exportSettings() {
    chrome.storage.sync.get(null, (settings) => {
      const dataStr = JSON.stringify(settings, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `chess-analyzer-settings-${Date.now()}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
      showStatus('📤 Settings exported', 'success');
    });
  }

  // Import settings from JSON file
  function importSettings(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const settings = JSON.parse(e.target.result);
        
        // Validate settings
        const validSettings = {};
        Object.keys(DEFAULT_SETTINGS).forEach(key => {
          if (settings.hasOwnProperty(key)) {
            validSettings[key] = settings[key];
          }
        });
        
        await chrome.storage.sync.set(validSettings);
        loadSettings();
        showStatus('📥 Settings imported successfully!', 'success');
        
      } catch (error) {
        console.error('Import error:', error);
        showStatus('❌ Invalid settings file', 'error');
      }
    };
    
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
  }

  // Show status message
  function showStatus(message, type = 'success') {
    const statusEl = $('statusMessage');
    statusEl.textContent = message;
    statusEl.style.background = type === 'success' ? '#00e676' : '#ff6b6b';
    statusEl.style.color = type === 'success' ? '#000' : '#fff';
    statusEl.classList.add('show');
    
    setTimeout(() => {
      statusEl.classList.remove('show');
    }, 3000);
  }

  // Initialize on load
  document.addEventListener('DOMContentLoaded', init);

  console.log('✅ Options script loaded');
})();