// background.js - Service worker for handling background tasks
import { summarizeWithOpenAI } from './utils/api-client.js';

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Background script received message:', request);
  
  if (request.action === 'summarize') {
    const url = request.url;
    
    // Check if this is a YouTube video
    const isYouTube = isYouTubeUrl(url);
    
    console.log(`Processing ${isYouTube ? 'YouTube video' : 'web page'}: ${url}`);
    
    // Send a message to the content script to extract the content
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs || tabs.length === 0) {
        sendResponse({
          error: 'No active tab found'
        });
        return;
      }
      
      const activeTab = tabs[0];
      
      // Make sure the URL in the request matches the active tab
      // This prevents issues when the popup is left open and user switches tabs
      if (activeTab.url !== url) {
        sendResponse({
          error: 'URL mismatch. Please close and reopen the extension.'
        });
        return;
      }
      
      // Execute content script to extract content
      chrome.tabs.sendMessage(
        activeTab.id,
        { action: 'extractContent' },
        function(contentResponse) {
          console.log('Received content extraction response:', contentResponse);
          
          if (!contentResponse) {
            // Content script may not have loaded properly
            sendResponse({
              error: 'Could not extract content. The page may still be loading or the content script is not initialized.'
            });
            return;
          }
          
          if (contentResponse.error) {
            sendResponse({
              error: contentResponse.error
            });
            return;
          }
          
          // For YouTube videos that require manual transcript opening
          // For YouTube videos where automatic transcript retrieval failed
          if (isYouTube &&
              contentResponse.error &&
              contentResponse.error.includes("Automatic transcript retrieval failed")) {
            sendResponse({
              error: "Could not retrieve YouTube transcript automatically. Please try again."
            });
            return;
          }
          
          // If we're in Phase 3, use the API client to get the summary
          let contentToSummarize = isYouTube ? contentResponse.transcript : contentResponse.content;
          let title = contentResponse.title || 'Untitled';
          
          // Process with API client
          summarizeWithOpenAI(contentToSummarize, isYouTube)
            .then(({ summary, title: generatedTitle }) => {
              // Format the summary with the generated title
              const formattedSummary = `
                <h2>${formatTextForDisplay(generatedTitle)}</h2>
                <div>
                  ${summary.replace(/\n/g, '<br>')}
                </div>
              `;
              
              sendResponse({
                summary: formattedSummary,
                title: generatedTitle // Include the generated title in the response
              });
            })
            .catch(error => {
              console.error('API summarization error:', error.message);
              
              // Check for API key related errors
              if (error.message.includes('API key is missing') ||
                  error.message.includes('Invalid API key')) {
                sendResponse({
                  error: error.message + ' To configure your API key, click the settings button in the top right corner.'
                });
              } else {
                sendResponse({
                  error: error.message
                });
              }
            });
        }
      );
    });
    
    return true; // Indicates we'll handle the response asynchronously
  }
});

/**
 * A fallback function to generate a message when API summarization is not available
 * This is used when a proper error is caught from the API client
 */
function generateFallbackMessage(contentResponse, isYouTube, errorMessage) {
  const title = contentResponse.title || 'Untitled';
  
  return `
    <h2>${title}</h2>
    <div class="error-notice">
      <p><strong>Error:</strong> ${errorMessage}</p>
      <p>Please check your API settings and try again.</p>
    </div>
  `;
}

/**
 * Format text for display in HTML
 */
function formatTextForDisplay(text) {
  // Convert newlines to <br> tags
  let formatted = text.replace(/\n/g, '<br>');
  // Escape any HTML in the content
  formatted = formatted
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
  
  return formatted;
}

/**
 * Check if a URL is a YouTube video
 */
function isYouTubeUrl(url) {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})(.*)$/;
  return youtubeRegex.test(url);
}