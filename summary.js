document.addEventListener('DOMContentLoaded', function() {
  const summaryContainer = document.getElementById('summary-container');
  const conciseTitle = document.getElementById('concise-title');
  const summaryContent = document.getElementById('summary-content');
  const copyBtn = document.getElementById('copy-btn');
  const saveBtn = document.getElementById('save-btn');
  const errorContainer = document.getElementById('error-container');
  const errorMessage = document.getElementById('error-message');

  // Function to show error message
  function showError(message) {
    errorMessage.textContent = message;
    errorContainer.classList.remove('hidden');
  }

  // Get the summary ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const summaryId = urlParams.get('id');

  if (!summaryId) {
    showError('No summary data found. Please try summarizing again.');
    return;
  }

  // Retrieve summary data from storage
  chrome.storage.local.get([summaryId], function(result) {
    const summaryData = result[summaryId];

    if (!summaryData) {
      showError('Summary data not found or expired. Please try summarizing again.');
      return;
    }

    // Display the title and summary
    //conciseTitle.textContent = summaryData.title;
    summaryContent.innerHTML = summaryData.summary;

    // Add YouTube styling if needed
    if (summaryData.isYouTube) {
      summaryContainer.classList.add('youtube-summary');
    }

    // Handle copy button click
    copyBtn.addEventListener('click', function() {
      const titleAndSummaryText = `Title: ${summaryData.title}\n\nSummary: ${summaryContent.textContent}`;
      navigator.clipboard.writeText(titleAndSummaryText)
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
      const titleAndSummaryText = `Title: ${summaryData.title}\n\nSummary: ${summaryContent.textContent}`;
      chrome.storage.sync.get({savedSummaries: []}, function(data) {
        const savedSummaries = data.savedSummaries;

        savedSummaries.push({
          url: summaryData.url,
          title: summaryData.title,
          summary: summaryContent.textContent,
          timestamp: new Date().toISOString()
        });

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