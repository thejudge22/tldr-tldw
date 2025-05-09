document.addEventListener('DOMContentLoaded', function() {
  const summarizeBtn = document.getElementById('summarize-btn');
  const loadingElement = document.getElementById('loading');
  const errorContainer = document.getElementById('error-container');
  const errorMessage = document.getElementById('error-message');
  const summaryContainer = document.getElementById('summary-container');
  const summaryContent = document.getElementById('summary-content');
  const copyBtn = document.getElementById('copy-btn');
  const saveBtn = document.getElementById('save-btn');

  // Ensure loading message is hidden on load
  loadingElement.classList.add('hidden');
  loadingElement.style.display = 'none';
  
  // Add settings button event listener
  const settingsButton = document.getElementById('settings-button');
  if (settingsButton) {
    settingsButton.addEventListener('click', function() {
      chrome.tabs.create({ url: 'popup/settings.html' });
    });
  }

  // Function to show error message
  function showError(message) {
    errorMessage.textContent = message;
    errorContainer.classList.remove('hidden');
  }
  
  // Function to hide error message
  function hideError() {
    errorContainer.classList.add('hidden');
  }
  
  // Function to show loading indicator
  function showLoading() {
    loadingElement.classList.remove('hidden');
    loadingElement.style.display = ''; // Or 'block', depending on default display
    summarizeBtn.disabled = true;
  }
  
  // Function to hide loading indicator
  function hideLoading() {
    loadingElement.classList.add('hidden');
    loadingElement.style.display = 'none';
    summarizeBtn.disabled = false;
  }
  
  
  // Handle summarize button click
  summarizeBtn.addEventListener('click', function() {
    hideError();
    showLoading();
    
    // Get the current active tab
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const currentTab = tabs[0];
      const currentUrl = currentTab.url;
      
      // Send message to background script to start summarization process
      chrome.runtime.sendMessage(
        { action: 'summarize', url: currentUrl },
        function(response) {
          hideLoading();
          
          if (response.error) {
            showError(response.error);
          } else if (response.summary) {
            // Generate a unique ID for this summary
            const summaryId = 'summary_' + Date.now();
            const isYouTube = currentUrl.includes('youtube.com/watch');
          
            // Store the summary data temporarily in local storage
            chrome.storage.local.set({
              [summaryId]: {
                summary: response.summary,
                title: response.title,
                url: currentUrl,
                isYouTube: isYouTube
              }
            }, function() {
              // Open the summary in a new tab
              chrome.tabs.create({
                url: chrome.runtime.getURL('summary.html') + '?id=' + summaryId
              });
          
              // Optional: Close the popup
              window.close();
            });
          } else {
            showError('Unknown error occurred.');
          }
        }
      );
    });
  });
  
  // Handle copy button click
  copyBtn.addEventListener('click', function() {
    const summaryText = summaryContent.textContent;
    navigator.clipboard.writeText(summaryText)
      .then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = 'Copy Summary';
        }, 2000);
      })
      .catch(err => {
        showError('Failed to copy: ' + err);
      });
  });
  
  // Handle save button click
  saveBtn.addEventListener('click', function() {
    const summaryText = summaryContent.textContent;
    chrome.storage.sync.get({savedSummaries: []}, function(data) {
      const savedSummaries = data.savedSummaries;
      // Get the current active tab URL to save with the summary
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentTab = tabs[0];
        const currentUrl = currentTab.url;
        
        savedSummaries.push({url: currentUrl, summary: summaryText, timestamp: new Date().toISOString()});
        chrome.storage.sync.set({savedSummaries: savedSummaries}, function() {
          saveBtn.textContent = 'Saved!';
          setTimeout(() => {
            saveBtn.textContent = 'Save Summary';
          }, 2000);
        });
      });
    });
  });
});