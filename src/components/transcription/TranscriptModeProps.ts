import type { ComponentType } from 'react';
import type { HighlightMode } from '@/lib/settings-storage';
import type { ClozeSegment } from '@/lib/cloze-block';
import type { TranscriptSegment } from '@/lib/api/transcription';

export interface TranscriptModeProps {
  clozeSegments: ClozeSegment[];
  rawSegments: TranscriptSegment[];
  currentTime: number;
  activeSegIdx: number;
  activeSegRef: React.RefObject<HTMLDivElement>;
  loopStart: number | null;
  loopEnd: number | null;
  highlightMode: HighlightMode;
  segmentLoopStartIdx: number;
  segmentLoopCount: number;
  onSeek: (seconds: number) => void;
  playSegmentCard: (idx: number) => void;
}

export type TranscriptModeComponent = ComponentType<TranscriptModeProps>;
