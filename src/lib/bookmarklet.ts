/**
 * Generate bookmarklet code that opens the current YouTube video in Language Lab Studio
 */
export function generateBookmarkletCode({ appUrl }: { appUrl: string }): string {
  const script = `
    (function() {
      const url = window.location.href;
      const videoIdMatch = url.match(/(?:youtube\\.com\\/watch\\?v=|youtu\\.be\\/)([^&\\n?#]+)/);
      if (videoIdMatch && videoIdMatch[1]) {
        const videoId = videoIdMatch[1];
        window.open('${appUrl}/youtube/video/' + videoId, '_blank');
      } else {
        alert('Not a YouTube video page');
      }
    })();
  `;
  return 'javascript:' + script.replace(/\s+/g, ' ').trim();
}

/**
 * Get the app URL based on current location
 */
export function getCurrentAppUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost:8080';
  
  const { protocol, hostname, port } = window.location;
  return `${protocol}//${hostname}${port ? ':' + port : ''}`;
}
