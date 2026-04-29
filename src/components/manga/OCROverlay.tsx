import { useState } from 'react';
import type { OCRPage } from '@/lib/api/manga';

interface OCROverlayProps {
  ocrData: OCRPage | null;
  imageWidth: number;
  imageHeight: number;
  showOCR: boolean;
  selectedBlocks?: number[];
  onBlockClick?: (blockIndex: number) => void;
}

export function OCROverlay({
  ocrData,
  imageWidth,
  imageHeight,
  showOCR,
  selectedBlocks = [],
  onBlockClick,
}: OCROverlayProps) {
  if (!showOCR || !ocrData) return null;

  const scaleX = imageWidth / ocrData.img_width;
  const scaleY = imageHeight / ocrData.img_height;

  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox={`0 0 ${ocrData.img_width} ${ocrData.img_height}`}
      style={{ cursor: onBlockClick ? 'pointer' : 'default' }}
    >
      {ocrData.blocks.map((block, idx) => {
        const [x1, y1, x2, y2] = block.box;
        const isSelected = selectedBlocks.includes(idx);

        return (
          <g key={idx}>
            {/* Block box */}
            <rect
              x={x1}
              y={y1}
              width={x2 - x1}
              height={y2 - y1}
              fill={isSelected ? 'rgba(34, 197, 94, 0.3)' : 'rgba(59, 130, 246, 0.1)'}
              stroke={isSelected ? '#22c55e' : '#3b82f6'}
              strokeWidth="2"
              onClick={() => onBlockClick?.(idx)}
              style={{ cursor: onBlockClick ? 'pointer' : 'default' }}
            />

            {/* Text label */}
            <text
              x={x1 + 2}
              y={y1 + 16}
              fontSize="12"
              fontFamily="monospace"
              fill={isSelected ? '#22c55e' : '#3b82f6'}
              className="pointer-events-none select-none"
            >
              {block.lines[0]?.substring(0, 20) || ''}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
