// Popup UI Logic
(function() {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const $$ = (selector) => document.querySelectorAll(selector);

  let currentTab = null;

  // Initialize popup
  async function init() {
    console.log('🎯 Popup initializing...');
    
    // Get current tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tabs[0];

    if (!currentTab || (!currentTab.url.includes('chess.com') && !currentTab.url.includes('lichess.org'))) {
      showError('❌ Please open Chess.com or Lichess.org');
      return;
    }

    // Check if content script is ready
    try {
      const response = await sendMessage({ action: 'ping' });
      if (response.injected) {
        showMainContent();
        await updateStatus();
        setupEventListeners();
      } else {
        showError('⏳ Analyzer loading... Please refresh page if stuck.');
      }
    } catch (error) {
      console.error('Error connecting:', error);
      showError('❌ Failed to connect. Try refreshing the page.');
    }
  }

  // Send message to content script
  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(currentTab.id, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }

  // Show main content
  function showMainContent() {
    $('loading').classList.remove('active');
    $('main-content').style.display = 'block';
  }

  // Show error message
  function showError(message) {
    $('loading').classList.add('active');
    $('loading').innerHTML = `<p style="color: #ff6b6b;">${message}</p>`;
  }

  // Update status display
  async function updateStatus() {
    try {
      const response = await sendMessage({ action: 'getStatus' });
      if (response.success && response.data) {
        const status = response.data;
        
        $('status').textContent = status.analyzing ? '🔄 Analyzing...' : '✅ Ready';
        $('engine').textContent = status.mode || 'blitz';
        $('mode').textContent = `${status.currentDepth || 12} depth`;

        // Update auto-move toggle
        $('autoMoveToggle').checked = status.autoMove || false;
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  }

  // Setup all event listeners
  function setupEventListeners() {
    // Analyze button
    $('analyzeBtn').addEventListener('click', async () => {
      try {
        await sendMessage({ action: 'analyze' });
        showNotification('🔍 Analyzing position...');
      } catch (error) {
        showNotification('❌ Analysis failed', true);
      }
    });

    // Move now button
    $('moveNowBtn').addEventListener('click', async () => {
      try {
        await sendMessage({ action: 'moveNow' });
        showNotification('⚡ Executing move...');
      } catch (error) {
        showNotification('❌ Move failed', true);
      }
    });

    // Auto-move toggle
    $('autoMoveToggle').addEventListener('change', async (e) => {
      const action = e.target.checked ? 'enableAutoMove' : 'disableAutoMove';
      try {
        await sendMessage({ action });
        showNotification(e.target.checked ? '🤖 Auto-move enabled' : '⏸️ Auto-move disabled');
        
        // Save to storage
        chrome.storage.sync.set({ autoMoveEnabled: e.target.checked });
      } catch (error) {
        showNotification('❌ Toggle failed', true);
        e.target.checked = !e.target.checked; // Revert
      }
    });

    // Engine selector
    $('engineSelect').addEventListener('change', async (e) => {
      const engine = e.target.value;
      try {
        await sendMessage({ action: 'setEngine', engine });
        showNotification(`🔧 Switched to ${engine}`);
        await updateStatus();
        
        // Save to storage
        chrome.storage.sync.set({ defaultEngine: engine });
      } catch (error) {
        showNotification('❌ Engine switch failed', true);
      }
    });

    // Mode buttons
    $$('.mode-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const mode = btn.dataset.mode;
        try {
          await sendMessage({ action: 'setMode', mode });
          showNotification(`⚡ Mode: ${mode.toUpperCase()}`);
          await updateStatus();
          
          // Highlight active button
          $('.mode-btn').forEach(b => b.style.opacity = '0.6');
          btn.style.opacity = '1';
          
          // Save to storage
          chrome.storage.sync.set({ defaultMode: mode });
        } catch (error) {
          showNotification('❌ Mode change failed', true);
        }
      });
    });

    // Speed buttons
    $$('.speed-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const speed = btn.dataset.speed;
        try {
          await sendMessage({ action: 'setMoveSpeed', speed });
          showNotification(`🚀 Speed: ${speed.toUpperCase()}`);
          
          // Highlight active button
          $('.speed-btn').forEach(b => b.style.opacity = '0.6');
          btn.style.opacity = '1';
          
          // Save to storage
          chrome.storage.sync.set({ moveSpeed: speed });
        } catch (error) {
          showNotification('❌ Speed change failed', true);
        }
      });
    });

    // Settings button
    $('settingsBtn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    // Help link
    $('helpLink').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://github.com/your-repo/chess-analyzer/wiki' });
    });

    // Load saved preferences
    loadSavedPreferences();
  }

  // Load saved preferences from storage
  async function loadSavedPreferences() {
    const settings = await chrome.storage.sync.get({
      defaultEngine: 'stockfish',
      defaultMode: 'blitz',
      moveSpeed: 'normal',
      autoMoveEnabled: false
    });

    // Set engine selector
    $('engineSelect').value = settings.defaultEngine;

    // Highlight active mode
    $$('.mode-btn').forEach(btn => {
      if (btn.dataset.mode === settings.defaultMode) {
        btn.style.opacity = '1';
      } else {
        btn.style.opacity = '0.6';
      }
    });

    // Highlight active speed
    $$('.speed-btn').forEach(btn => {
      if (btn.dataset.speed === settings.moveSpeed) {
        btn.style.opacity = '1';
      } else {
        btn.style.opacity = '0.6';
      }
    });

    // Set auto-move toggle
    $('autoMoveToggle').checked = settings.autoMoveEnabled;
  }

  // Show notification toast
  function showNotification(message, isError = false) {
    const status = $('status');
    const originalText = status.textContent;
    const originalColor = status.style.color;
    
    status.textContent = message;
    status.style.color = isError ? '#ff6b6b' : '#00e676';
    
    setTimeout(() => {
      status.textContent = originalText;
      status.style.color = originalColor;
    }, 2000);
  }

  // Auto-refresh status every 3 seconds
  setInterval(async () => {
    if ($('main-content').style.display !== 'none') {
      await updateStatus();
    }
  }, 3000);

  // Initialize on load
  document.addEventListener('DOMContentLoaded', init);

  console.log('✅ Popup script loaded');

})();
