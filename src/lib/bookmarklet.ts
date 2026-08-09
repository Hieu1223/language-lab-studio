import { translate } from '@/lib/i18n-runtime';

/**
 * Generate bookmarklet code that opens the current YouTube video in ArisuGo.
 *
 * The alert text is resolved and inlined at generation time on purpose: the
 * script executes on youtube.com, where no i18n runtime exists, and the user
 * saves the result as a browser bookmark. Changing the app locale later will
 * not update an already-saved bookmarklet.
 */
export function generateBookmarkletCode({ appUrl }: { appUrl: string }): string {
  const notAVideoMessage = translate(
    'bookmarklet.notYouTube',
    'Not a YouTube video page',
  );
  // JSON-encode so quotes/apostrophes in any locale can't break out of the
  // string literal once the script is collapsed into a `javascript:` URL.
  const encodedMessage = JSON.stringify(notAVideoMessage);

  const script = `
    (function() {
      const url = window.location.href;
      const videoIdMatch = url.match(/(?:youtube\\.com\\/watch\\?v=|youtu\\.be\\/)([^&\\n?#]+)/);
      if (videoIdMatch && videoIdMatch[1]) {
        const videoId = videoIdMatch[1];
        window.open('${appUrl}/youtube/video/' + videoId, '_blank');
      } else {
        alert(${encodedMessage});
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
