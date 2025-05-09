document.addEventListener('DOMContentLoaded', function() {
  const settingsForm = document.getElementById('settingsForm');
  const endpointUrlInput = document.getElementById('endpointUrl');
  const modelNameInput = document.getElementById('modelName');
  const apiKeyInput = document.getElementById('apiKey');
  const messageDiv = document.getElementById('message');
  const exportSettingsButton = document.getElementById('exportSettings');
  const importSettingsButton = document.getElementById('importSettings');
  const importFileInput = document.getElementById('importFile');

  // Load settings
  chrome.storage.sync.get(['endpointUrl', 'modelName', 'apiKey'], function(items) {
    endpointUrlInput.value = items.endpointUrl || 'https://api.openai.com/v1/chat/completions';
    modelNameInput.value = items.modelName || 'gpt-4.1-nano';
    apiKeyInput.value = items.apiKey || '';
  });

  // Save settings
  settingsForm.addEventListener('submit', function(event) {
    event.preventDefault();
    chrome.storage.sync.set({
      endpointUrl: endpointUrlInput.value,
      modelName: modelNameInput.value,
      apiKey: apiKeyInput.value
    }, function() {
      showMessage('Settings saved successfully!');
    });
  });

  // Export settings
  exportSettingsButton.addEventListener('click', function() {
    chrome.storage.sync.get(['endpointUrl', 'modelName', 'apiKey'], function(items) {
      const settingsJson = JSON.stringify(items, null, 2);
      const blob = new Blob([settingsJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'summarizer_settings.json';
      a.click();
      URL.revokeObjectURL(url);
    });
  });

  // Import settings
  importSettingsButton.addEventListener('click', function() {
    importFileInput.click();
  });

  importFileInput.addEventListener('change', function() {
    const file = importFileInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const importedSettings = JSON.parse(e.target.result);
          // Basic validation
          if (importedSettings && typeof importedSettings === 'object') {
            chrome.storage.sync.set(importedSettings, function() {
              showMessage('Settings imported successfully! Please refresh the popup to see changes.');
              // Optionally reload settings after import
              chrome.storage.sync.get(['endpointUrl', 'modelName', 'apiKey'], function(items) {
                endpointUrlInput.value = items.endpointUrl || 'https://api.openai.com/v1/chat/completions';
                modelNameInput.value = items.modelName || 'gpt-4.1-nano';
                apiKeyInput.value = items.apiKey || '';
              });
            });
          } else {
            showMessage('Invalid settings file.', true);
          }
        } catch (e) {
          showMessage('Error parsing settings file.', true);
        }
      };
      reader.readAsText(file);
    }
  });

  function showMessage(text, isError = false) {
    messageDiv.textContent = text;
    messageDiv.className = isError ? 'error' : '';
    setTimeout(() => {
      messageDiv.textContent = '';
      messageDiv.className = '';
    }, 5000);
  }
});