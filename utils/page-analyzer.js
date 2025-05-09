// page-analyzer.js - Functions to analyze the current page type

// This will be expanded in Phase 2
function analyzeCurrentPage(url) {
  const isYouTube = isYouTubeUrl(url);
  return {
    url: url,
    type: isYouTube ? 'youtube' : 'webpage'
  };
}

function isYouTubeUrl(url) {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(.*)$/;
  return youtubeRegex.test(url);
}

// Export functions
export { analyzeCurrentPage, isYouTubeUrl };