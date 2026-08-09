import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { MangaImage } from '@/components/manga/MangaImage';
import { OCROverlay } from '@/components/manga/OCROverlay';
import type { OCRPage, SelectedBlock } from '@/components/manga/reader-types';

export interface MangaPageProps {
  src: string;
  pageIndex: number;
  ocrData: OCRPage | null;
  showOCRBoxes: boolean;
  boxPadding: number;
  fitMode: 'contain' | 'width';
  containerW?: number;
  containerH?: number;
  selectedBlock: SelectedBlock | null;
  onSelectBlock: (pageIdx: number, blockIdx: number) => void;
}

/**
 * A single manga page image plus its OCR text overlay.
 *
 * The overlay must be positioned against the *rendered* image box, not the
 * element box: in `contain` mode the image is letterboxed inside the viewport,
 * so we recompute the drawn rect from the natural aspect ratio on load/resize.
 */
export function MangaPage({
  src,
  pageIndex,
  ocrData,
  showOCRBoxes,
  boxPadding,
  fitMode,
  containerW = 0,
  containerH = 0,
  selectedBlock,
  onSelectBlock,
}: MangaPageProps) {
  const { t } = useTranslation('manga');
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [renderedSize, setRenderedSize] = useState({ w: 0, h: 0, left: 0, top: 0 });

  const computeRendered = useCallback(() => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return;
    if (fitMode === 'width') {
      setRenderedSize({ w: img.offsetWidth, h: img.offsetHeight, left: 0, top: 0 });
    } else {
      const natAr = img.naturalWidth / img.naturalHeight;
      const boxAr = containerW / containerH;
      let rw: number, rh: number;
      if (natAr > boxAr) {
        rw = containerW;
        rh = containerW / natAr;
      } else {
        rh = containerH;
        rw = containerH * natAr;
      }
      const left = (containerW - rw) / 2;
      const top = (containerH - rh) / 2;
      setRenderedSize({ w: rw, h: rh, left, top });
    }
  }, [fitMode, containerW, containerH]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete && img.naturalWidth) computeRendered();
    img.addEventListener('load', computeRendered);
    const ro = new ResizeObserver(computeRendered);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => {
      img.removeEventListener('load', computeRendered);
      ro.disconnect();
    };
  }, [src, computeRendered]);

  useEffect(() => {
    computeRendered();
  }, [computeRendered, containerW, containerH]);

  if (fitMode === 'contain') {
    return (
      <div
        ref={wrapRef}
        style={{ width: containerW, height: containerH, position: 'relative', flexShrink: 0 }}
      >
        <MangaImage
          ref={imgRef}
          src={src}
          alt={t('reader.pageAlt', { page: pageIndex + 1 })}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          draggable={false}
          onLoad={computeRendered}
        />
        {ocrData && renderedSize.w > 0 && (
          <div
            style={{
              position: 'absolute',
              left: renderedSize.left,
              top: renderedSize.top,
              width: renderedSize.w,
              height: renderedSize.h,
            }}
          >
            <OCROverlay
              ocrData={ocrData}
              imgW={renderedSize.w}
              imgH={renderedSize.h}
              showBoxes={showOCRBoxes}
              boxPadding={boxPadding}
              pageIdx={pageIndex}
              selectedBlock={selectedBlock}
              onSelectBlock={onSelectBlock}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <MangaImage
        ref={imgRef}
        src={src}
        alt={t('reader.pageAlt', { page: pageIndex + 1 })}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        draggable={false}
        onLoad={computeRendered}
      />
      {ocrData && renderedSize.w > 0 && (
        <OCROverlay
          ocrData={ocrData}
          imgW={renderedSize.w}
          imgH={renderedSize.h}
          showBoxes={showOCRBoxes}
          boxPadding={boxPadding}
          pageIdx={pageIndex}
          selectedBlock={selectedBlock}
          onSelectBlock={onSelectBlock}
        />
      )}
    </div>
  );
}

export default MangaPage;
