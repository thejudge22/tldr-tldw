// content.js - Content script that runs in the context of web pages

// Import the extraction utilities
// Note: We can't use ES6 imports directly in content scripts
// So we'll need to implement the functions directly here

/**
 * Extracts content from the current web page
 * This function is a simplified version of extractWebPageContent() from utils/content-extractor.js
 */
function extractPageContent() {
  // Article containers typically have these classes or IDs
  const possibleArticleSelectors = [
    'article',
    '[role="main"]',
    '.post-content',
    '.article-content',
    '.post-body',
    '.entry-content',
    '.content-body',
    '#content',
    '.content',
    '.post',
    '.article',
    'main'
  ];

  // Elements to avoid
  const avoidSelectors = [
    'nav',
    'header',
    'footer',
    '#header',
    '#footer',
    '.nav',
    '.navigation',
    '.menu',
    '.sidebar',
    '.comments',
    '.related',
    '.ad',
    '.advertisement',
    '.social',
    '.share',
    'aside'
  ];

  // Find a main article container
  let mainContent = null;
  
  // Try each possible article selector
  for (const selector of possibleArticleSelectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      // Find the element with the most text content
      let bestElement = null;
      let maxTextLength = 0;
      
      elements.forEach(element => {
        // Skip elements that are hidden
        if (isHidden(element)) return;
        
        const text = element.textContent;
        if (text && text.length > maxTextLength) {
          maxTextLength = text.length;
          bestElement = element;
        }
      });
      
      if (bestElement && maxTextLength > 500) {
        // We found a good candidate
        mainContent = bestElement;
        break;
      }
    }
  }

  // If we couldn't find a good container, extract content from body
  if (!mainContent) {
    mainContent = document.createElement('div');
    const paragraphs = document.querySelectorAll('p');
    
    paragraphs.forEach(p => {
      // Skip paragraphs in elements we want to avoid
      for (const avoidSelector of avoidSelectors) {
        if (p.closest(avoidSelector)) return;
      }
      
      // Skip hidden or tiny paragraphs
      if (isHidden(p) || p.textContent.length < 20) return;
      
      mainContent.appendChild(p.cloneNode(true));
    });
  }

  // Extract and clean the main content
  let extractedText = '';
  if (mainContent) {
    // Create a clone to safely manipulate
    const contentClone = mainContent.cloneNode(true);
    
    // Remove elements to avoid
    avoidSelectors.forEach(selector => {
      const elementsToRemove = contentClone.querySelectorAll(selector);
      elementsToRemove.forEach(el => el.remove());
    });
    
    // Extract text, preserving paragraph breaks
    const paragraphs = contentClone.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li');
    paragraphs.forEach(p => {
      const text = p.textContent.trim();
      if (text.length > 0) {
        extractedText += text + '\n\n';
      }
    });
    
    // If we didn't get much from paragraphs, use all text
    if (extractedText.length < 200) {
      extractedText = contentClone.textContent;
    }
  } else {
    // Fallback: just get the body text
    extractedText = document.body.textContent;
  }

  // Clean up the text
  extractedText = cleanText(extractedText);
  
  // Limit content size if it's too large
  const MAX_CHARS = 80000;
  if (extractedText.length > MAX_CHARS) {
    extractedText = extractedText.substring(0, MAX_CHARS) +
      "\n\n[Content truncated due to size limitations]";
  }

  return {
    title: document.title,
    content: extractedText,
    url: window.location.href
  };
}

/**
 * Cleans and formats extracted text
 */
function cleanText(text) {
  // Replace multiple whitespace with single space
  let cleaned = text.replace(/\s+/g, ' ');
  
  // Replace multiple newlines with double newlines
  cleaned = cleaned.replace(/\n+/g, '\n\n');
  
  // Trim leading/trailing whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * Checks if an element is hidden via CSS
 */
function isHidden(el) {
  const style = window.getComputedStyle(el);
  return style.display === 'none' ||
         style.visibility === 'hidden' ||
         style.opacity === '0' ||
         (el.getBoundingClientRect().height === 0 &&
          el.getBoundingClientRect().width === 0);
}

/**
 * Extracts YouTube transcript from page
 */
async function extractYouTubeTranscript() {
  // Check if we're on a YouTube video page
  if (!isYouTubePage()) {
    return { error: "Not a YouTube video page" };
  }
  
  const videoId = getYouTubeVideoIdFromPage();
  const videoTitle = getYouTubeVideoTitle();
  
  if (!videoId) {
    return { error: "Could not identify YouTube video ID" };
  }
  
  // Try to get transcript from the UI, automatically opening if needed
  try {
    const transcript = await getYouTubeTranscriptFromUI();

    if (!transcript || transcript.length < 100) {
      // Check for specific error returned by getYouTubeTranscriptFromUI
      if (transcript === "ERROR_OPENING_TRANSCRIPT") {
         return {
           videoId: videoId,
           title: videoTitle,
           error: "Automatic transcript retrieval failed." // Error message updated for background script
         };
      } else {
        return {
          videoId: videoId,
          title: videoTitle,
          error: "Transcript not available or too short."
        };
      }
    }
    
    return {
      videoId: videoId,
      title: videoTitle,
      transcript: transcript
    };
  } catch (error) {
    // Handle errors from waitForTranscriptToLoad or getYouTubeTranscriptFromUI
    return {
      videoId: videoId,
      title: videoTitle,
      error: `Error retrieving transcript: ${error.message}`
    };
  }
}

/**
 * Checks if current page is a YouTube video page
 */
function isYouTubePage() {
  return (
    window.location.hostname.includes('youtube.com') &&
    (window.location.pathname.includes('/watch') ||
     window.location.pathname.includes('/shorts/'))
  );
}

/**
 * Gets YouTube video ID from current page
 */
function getYouTubeVideoIdFromPage() {
  // From URL for /watch pages
  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get('v');
  if (videoId) return videoId;
  
  // From URL for /shorts pages
  const shortsMatch = window.location.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) return shortsMatch[1];
  
  // From canonical link as backup
  const canonicalLink = document.querySelector('link[rel="canonical"]');
  if (canonicalLink) {
    const linkVideoId = new URL(canonicalLink.href).searchParams.get('v');
    if (linkVideoId) return linkVideoId;
    
    const linkShortsMatch = canonicalLink.href.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (linkShortsMatch) return linkShortsMatch[1];
  }
  
  return null;
}

/**
 * Gets video title from YouTube page
 */
function getYouTubeVideoTitle() {
  // Try multiple selectors for compatibility
  const titleSelectors = [
    'h1.title yt-formatted-string',
    'h1.ytd-video-primary-info-renderer',
    'h1.title',
    'h1.watch-title',
    'yt-formatted-string.ytd-video-primary-info-renderer'
  ];
  
  for (const selector of titleSelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim()) {
      return element.textContent.trim();
    }
  }
  
  // Fallback to document title
  const docTitle = document.title;
  if (docTitle.includes(' - YouTube')) {
    return docTitle.split(' - YouTube')[0].trim();
  }
  
  return docTitle || "YouTube Video";
}

/**
 * Extracts transcript from YouTube's UI
 */
async function getYouTubeTranscriptFromUI() {
  // First try the transcript panel if it's open
  const transcriptElements = Array.from(document.querySelectorAll('ytd-transcript-segment-renderer'));
  
  if (transcriptElements.length > 0) {
    const segments = transcriptElements.map(element => {
      const textElem = element.querySelector('.segment-text');
      return textElem ? textElem.textContent.trim() : '';
    }).filter(text => text.length > 0);
    
    if (segments.length > 0) {
      return segments.join(' ');
    }
  }
  
  // Try alternate UI versions
  const transcriptRows = Array.from(document.querySelectorAll('.ytd-transcript-renderer'));
  if (transcriptRows.length > 0) {
    const segments = transcriptRows.map(row => {
      const textElem = row.querySelector('.segment-text, .cue-text');
      return textElem ? textElem.textContent.trim() : '';
    }).filter(text => text.length > 0);
    
    if (segments.length > 0) {
      return segments.join(' ');
    }
  }
  
  // If transcript not found, try to automatically open it
  const transcriptButton = findTranscriptButton();
  if (transcriptButton) {
    try {
      // Click the button to open transcript panel
      transcriptButton.click();
      
      // Wait for transcript to load
      return await waitForTranscriptToLoad();
    } catch (error) {
      console.error('Error opening transcript:', error);
      return "ERROR_OPENING_TRANSCRIPT";
    }
  }
  
  return "";
}

/**
 * Waits for the YouTube transcript to load in the UI
 * @returns {Promise<string|null>} Promise resolving to transcript text or null if timeout
 */
function waitForTranscriptToLoad() {
  return new Promise((resolve, reject) => {
    const maxAttempts = 15;  // Maximum number of attempts (3 seconds)
    let attempts = 0;
    
    function checkForTranscript() {
      // Check for transcript elements using various selectors
      const transcriptElements = document.querySelectorAll('ytd-transcript-segment-renderer');
      const alternateElements = document.querySelectorAll('.ytd-transcript-renderer');
      
      if (transcriptElements.length > 0) {
        // Extract text from primary transcript UI
        const segments = Array.from(transcriptElements).map(element => {
          const textElem = element.querySelector('.segment-text');
          return textElem ? textElem.textContent.trim() : '';
        }).filter(text => text.length > 0);
        
        if (segments.length > 0) {
          resolve(segments.join(' '));
          return;
        }
      }
      
      if (alternateElements.length > 0) {
        // Extract text from alternate transcript UI
        const segments = Array.from(alternateElements).map(row => {
          const textElem = row.querySelector('.segment-text, .cue-text');
          return textElem ? textElem.textContent.trim() : '';
        }).filter(text => text.length > 0);
        
        if (segments.length > 0) {
          resolve(segments.join(' '));
          return;
        }
      }
      
      if (attempts >= maxAttempts) {
        // Timeout - transcript didn't load
        reject(new Error("Transcript did not load within the expected time"));
        return;
      }
      
      // Try again after a delay
      attempts++;
      setTimeout(checkForTranscript, 200);  // Check every 200ms
    }
    
    // Start checking
    checkForTranscript();
  });
}
/**
 * Finds the button to open the transcript panel
 */
function findTranscriptButton() {
  // Try multiple selectors for the transcript button
  const buttonSelectors = [
    'button[aria-label="Show transcript"]',
    'yt-formatted-string:contains("Show transcript")',
    'yt-formatted-string:contains("Open transcript")',
    'button:contains("transcript")'
  ];
  
  for (const selector of buttonSelectors) {
    try {
      const element = document.querySelector(selector);
      if (element) return element;
    } catch {
      // Some selectors might be invalid, continue to next
      continue;
    }
  }
  
  // Try finding buttons by text content
  const buttons = Array.from(document.querySelectorAll('button, yt-formatted-string'));
  for (const button of buttons) {
    const text = button.textContent.toLowerCase();
    if (text.includes('transcript') || text.includes('show transcript')) {
      return button;
    }
  }
  
  return null;
}

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Content script received message:', request);
  
  if (request.action === 'extractContent') {
    // Check if we're on a YouTube page
    const isYouTube = isYouTubePage();
    
    if (isYouTube) {
      console.log('Extracting content from a YouTube page');
      
      // Handle the async function properly
      extractYouTubeTranscript()
        .then(result => {
          sendResponse(result);
        })
        .catch(error => {
          sendResponse({ error: "Error extracting YouTube transcript: " + error.message });
        });
    } else {
      console.log('Extracting content from a regular web page');
      const content = extractPageContent();
      sendResponse(content);
    }
    
    return true; // Indicates we'll send a response asynchronously
  }
});

// Log that the content script has loaded
console.log('Web & YouTube Summarizer content script loaded');