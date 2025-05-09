// youtube-helper.js - Functions to work with YouTube videos and transcripts

/**
 * Extracts video ID from a YouTube URL
 * @param {string} url - The YouTube URL
 * @returns {string|null} The video ID or null if not found
 */
function getYouTubeVideoId(url) {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

/**
 * Extracts the transcript from a YouTube video page
 * @returns {Object} Object with videoId, title, and transcript
 */
function extractYouTubeTranscript() {
  return new Promise((resolve, reject) => {
    try {
      const videoId = getYouTubeVideoIdFromPage();
      const videoTitle = getYouTubeVideoTitle();
      
      if (!videoId) {
        reject(new Error("Could not find YouTube video ID"));
        return;
      }
      
      // Method 1: Try to get transcript from the UI (more reliable)
      const transcript = getTranscriptFromUI();
      
      if (transcript) {
        resolve({
          videoId: videoId,
          title: videoTitle,
          transcript: transcript
        });
        return;
      }
      
      // Method 2: Try to load transcript through YouTube's internal API
      loadTranscriptFromAPI(videoId)
        .then(apiTranscript => {
          if (apiTranscript) {
            resolve({
              videoId: videoId,
              title: videoTitle,
              transcript: apiTranscript
            });
          } else {
            reject(new Error("Could not extract YouTube transcript"));
          }
        })
        .catch(error => {
          reject(error);
        });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Gets the video ID from the current YouTube page
 * @returns {string|null} The video ID or null if not found
 */
function getYouTubeVideoIdFromPage() {
  // From URL
  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get('v');
  
  if (videoId) return videoId;
  
  // From canonical link (backup method)
  const canonicalLink = document.querySelector('link[rel="canonical"]');
  if (canonicalLink) {
    return getYouTubeVideoId(canonicalLink.href);
  }
  
  return null;
}

/**
 * Gets the video title from the current YouTube page
 * @returns {string} The video title
 */
function getYouTubeVideoTitle() {
  // Try primary title locations
  const titleElement =
    document.querySelector('h1.title') ||
    document.querySelector('h1.watch-title') ||
    document.querySelector('h1.ytd-video-primary-info-renderer');
  
  if (titleElement) {
    return titleElement.textContent.trim();
  }
  
  // Fallback to document title (remove " - YouTube" suffix)
  let docTitle = document.title;
  if (docTitle.endsWith(" - YouTube")) {
    docTitle = docTitle.substring(0, docTitle.length - 10);
  }
  
  return docTitle || "YouTube Video";
}

/**
 * Attempts to extract transcript from YouTube's UI
 * @returns {string|null} The transcript text or null if not found
 */
function getTranscriptFromUI() {
  // Try to find transcript container in current UI
  const transcriptElements = Array.from(document.querySelectorAll('ytd-transcript-segment-renderer'));
  
  if (transcriptElements.length > 0) {
    // Extract text from each segment
    const textSegments = transcriptElements.map(segment => {
      const textElement = segment.querySelector('.segment-text');
      return textElement ? textElement.textContent.trim() : '';
    });
    
    return textSegments.join(' ');
  }
  
  // Try alternative transcript container
  const transcriptList = document.querySelector('.ytd-transcript-renderer');
  if (transcriptList) {
    const segments = Array.from(transcriptList.querySelectorAll('.segment'));
    const textSegments = segments.map(segment => {
      const textElement = segment.querySelector('.segment-text');
      return textElement ? textElement.textContent.trim() : '';
    });
    
    return textSegments.join(' ');
  }
  
  return null;
}

/**
 * Attempts to load transcript through YouTube's internal API
 * @param {string} videoId - The YouTube video ID
 * @returns {Promise<string|null>} Promise resolving to transcript text or null
 */
function loadTranscriptFromAPI(videoId) {
  return new Promise((resolve, reject) => {
    // This is an approximation - actual implementation may vary
    // based on how YouTube's internal API changes
    
    // Strategy: Inject a script that triggers the transcript open UI
    // then extract the loaded data
    
    // First, look for the transcript button and click it
    const openTranscriptButton = findTranscriptButton();
    
    if (openTranscriptButton) {
      // Click the button to open transcript panel
      openTranscriptButton.click();
      
      // Wait for transcript to load
      setTimeout(() => {
        const transcript = getTranscriptFromUI();
        if (transcript) {
          resolve(transcript);
        } else {
          resolve(null);
        }
      }, 1500); // Give time for transcript to load
    } else {
      // Button not found, can't load transcript this way
      resolve(null);
    }
  });
}

/**
 * Finds the button to open the transcript panel
 * @returns {Element|null} The button element or null if not found
 */
function findTranscriptButton() {
  // There are several possible selectors depending on YouTube's UI version
  const possibleSelectors = [
    // Current UI
    'button[aria-label="Show transcript"]',
    // Some alternative patterns
    'button.ytd-transcript-button-renderer',
    'ytd-button-renderer:contains("Transcript")',
    'button:contains("Show transcript")'
  ];
  
  for (const selector of possibleSelectors) {
    try {
      const button = document.querySelector(selector);
      if (button) return button;
    } catch (e) {
      // Some selectors might throw errors, just continue to next one
      continue;
    }
  }
  
  // Try to find by text content
  const allButtons = document.querySelectorAll('button');
  for (const button of allButtons) {
    if (button.textContent.includes('transcript') ||
        button.textContent.includes('Transcript')) {
      return button;
    }
  }
  
  return null;
}

// Export functions
export { extractYouTubeTranscript, getYouTubeVideoId };