import { forwardRef, type ImgHTMLAttributes, type SyntheticEvent, useEffect, useMemo, useState } from 'react';

const MANGA_IMAGE_PROXY_ENV =
  typeof import.meta !== 'undefined'
    ? (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_MANGA_IMAGE_PROXY_URL?.trim() || ''
    : '';

function buildMangaImageProxyUrl(originalUrl: string): string | null {
  if (!MANGA_IMAGE_PROXY_ENV) return null;

  const proxyBase = MANGA_IMAGE_PROXY_ENV.replace(/\/+$/, '');
  if (!originalUrl) return null;

  if (proxyBase.includes('{{url}}')) {
    return proxyBase.replace('{{url}}', encodeURIComponent(originalUrl));
  }

  return `${proxyBase}/${encodeURIComponent(originalUrl)}`;
}

export interface MangaImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
}

export const MangaImage = forwardRef<HTMLImageElement, MangaImageProps>(
  ({ src, onError, ...props }, ref) => {
    const [currentSrc, setCurrentSrc] = useState<string>(src);
    const [triedProxy, setTriedProxy] = useState(false);

    useEffect(() => {
      setCurrentSrc(src);
      setTriedProxy(false);
    }, [src]);

    const proxyUrl = useMemo(() => buildMangaImageProxyUrl(src), [src]);

    const handleError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
      if (!triedProxy && proxyUrl && event.currentTarget.src !== proxyUrl) {
        setCurrentSrc(proxyUrl);
        setTriedProxy(true);
        return;
      }

      if (onError) {
        onError(event);
      }
    };

    return <img {...props} ref={ref} src={currentSrc} onError={handleError} />;
  }
);

MangaImage.displayName = 'MangaImage';
