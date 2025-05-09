// content-extractor.js - Functions to extract content from web pages

/**
 * Extracts main content from a web page by analyzing the DOM structure
 * Uses a simple algorithm to find text-rich nodes and avoid navigation, headers, footers, etc.
 * @returns {Object} Object containing title and extracted content
 */
function extractWebPageContent() {
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

  // Elements to explicitly avoid
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

  // First try to find a main article container
  let mainContent = null;
  
  // Try each possible article selector
  for (const selector of possibleArticleSelectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      // Find the element with the most text content
      let bestElement = null;
      let maxTextLength = 0;
      
      elements.forEach(element => {
        // Skip elements that are hidden or have zero size
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
  // while avoiding navigation, headers, etc.
  if (!mainContent) {
    mainContent = document.createElement('div');
    const paragraphs = document.querySelectorAll('p');
    
    paragraphs.forEach(p => {
      // Skip paragraphs that are in elements we want to avoid
      for (const avoidSelector of avoidSelectors) {
        if (p.closest(avoidSelector)) return;
      }
      
      // Skip hidden or tiny paragraphs (likely UI elements)
      if (isHidden(p) || p.textContent.length < 20) return;
      
      // Clone the paragraph and add it to our content
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
  const MAX_CHARS = 80000; // Safe limit for most API processing
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
 * @param {string} text - The text to clean
 * @returns {string} Cleaned text
 */
function cleanText(text) {
  // Replace multiple whitespace characters with a single space
  let cleaned = text.replace(/\s+/g, ' ');
  
  // Replace multiple newlines with double newlines (for paragraphs)
  cleaned = cleaned.replace(/\n+/g, '\n\n');
  
  // Trim leading/trailing whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * Checks if an element is hidden via CSS
 * @param {Element} el - The element to check
 * @returns {boolean} True if the element is hidden
 */
function isHidden(el) {
  const style = window.getComputedStyle(el);
  return style.display === 'none' ||
         style.visibility === 'hidden' ||
         style.opacity === '0' ||
         (el.getBoundingClientRect().height === 0 &&
          el.getBoundingClientRect().width === 0);
}

// Export functions
export { extractWebPageContent };