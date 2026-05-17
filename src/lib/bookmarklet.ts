/**
 * Generate a bookmarklet that opens YouTube videos in this app
 */

interface BookmarkletConfig {
  appUrl: string; // e.g., "https://language-lab.com"
}

export function generateBookmarkletCode(config: BookmarkletConfig): string {
  const appUrl = config.appUrl;
  
  // The bookmarklet code - extract video ID and open in app
  const bookmarkletCode = `
    (function() {
      const url = window.location.href;
      const videoIdMatch = url.match(/(?:youtube\\.com\\/watch\\?v=|youtu\\.be\\/)([^&\\n?#]+)/);
      
      if (!videoIdMatch || !videoIdMatch[1]) {
        alert('ไม่พบ YouTube video ID ในหน้านี้');
        return;
      }
      
      const videoId = videoIdMatch[1];
      const appUrl = '${appUrl}';
      const viewerUrl = appUrl + '/youtube/video/' + videoId;
      
      window.open(viewerUrl, '_blank');
    })();
  `.trim();
  
  // Return as a data URI
  return `javascript:${encodeURIComponent(bookmarkletCode)}`;
}

/**
 * Get the current app URL
 */
export function getCurrentAppUrl(): string {
  return window.location.origin;
}
