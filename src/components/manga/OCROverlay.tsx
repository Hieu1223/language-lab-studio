import { Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { OCRPage, SelectedBlock } from '@/components/manga/reader-types';
import { copyToClipboard } from '@/lib/clipboard';

export interface OCROverlayProps {
  ocrData: OCRPage;
  imgW: number;
  imgH: number;
  showBoxes: boolean;
  boxPadding: number;
  pageIdx: number;
  selectedBlock: SelectedBlock | null;
  onSelectBlock: (pageIdx: number, blockIdx: number) => void;
}

/**
 * Transparent, selectable text layer rendered on top of a manga page image.
 * Each OCR block is absolutely positioned over its source box (scaled from the
 * OCR-native resolution to the rendered image size) with invisible text so the
 * user can select/copy the original Japanese.
 */
export function OCROverlay({
  ocrData,
  imgW,
  imgH,
  showBoxes,
  boxPadding,
  pageIdx,
  selectedBlock,
  onSelectBlock,
}: OCROverlayProps) {
  const { t } = useTranslation('manga');
  const scaleX = imgW / ocrData.img_width;
  const scaleY = imgH / ocrData.img_height;

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ userSelect: 'text', pointerEvents: 'none' }}
    >
      {ocrData.blocks.map((block, idx) => {
        const [x1, y1, x2, y2] = block.box;
        const left = x1 * scaleX - boxPadding;
        const top = y1 * scaleY - boxPadding;
        const width = (x2 - x1) * scaleX + boxPadding * 2;
        const height = (y2 - y1) * scaleY + boxPadding * 2;
        const scaledFont = Math.max(8, block.font_size * Math.min(scaleX, scaleY));
        const text = block.lines.join('\n');
        const isSelected =
          selectedBlock?.pageIdx === pageIdx && selectedBlock?.blockIdx === idx;

        const borderCls = isSelected
          ? 'border-2 border-amber-400 bg-amber-400/20 rounded-sm shadow-lg'
          : showBoxes
            ? 'border-2 border-blue-400/70 bg-blue-400/10 rounded-sm hover:border-blue-400 hover:bg-blue-400/20'
            : 'border-2 border-transparent';

        return (
          <div
            key={idx}
            className={`absolute group transition-colors ${borderCls}`}
            style={{ left, top, width, height, pointerEvents: 'auto', cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectBlock(pageIdx, idx);
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                copyToClipboard(text);
              }}
              className={`absolute -top-2 -right-2 z-10 rounded-full p-1 bg-black/70 text-white hover:bg-primary hover:text-primary-foreground transition-opacity ${
                showBoxes || isSelected ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              aria-label={t('reader.copyOcrText')}
              title={t('reader.copyAllText')}
            >
              <Copy className="w-3 h-3" />
            </button>

            {block.vertical ? (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'row-reverse',
                  overflow: 'hidden',
                  cursor: 'text',
                  userSelect: 'text',
                  WebkitUserSelect: 'text',
                }}
              >
                {block.lines.map((line, li) => (
                  <div
                    key={li}
                    style={{
                      flex: '1 1 0',
                      writingMode: 'vertical-rl',
                      textOrientation: 'mixed',
                      fontSize: scaledFont,
                      lineHeight: 1,
                      color: 'transparent',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      userSelect: 'text',
                      WebkitUserSelect: 'text',
                    }}
                  >
                    {line}
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  cursor: 'text',
                  userSelect: 'text',
                  WebkitUserSelect: 'text',
                }}
              >
                {block.lines.map((line, li) => (
                  <div
                    key={li}
                    style={{
                      flex: '1 1 0',
                      fontSize: scaledFont,
                      lineHeight: 1,
                      color: 'transparent',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      userSelect: 'text',
                      WebkitUserSelect: 'text',
                    }}
                  >
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default OCROverlay;
