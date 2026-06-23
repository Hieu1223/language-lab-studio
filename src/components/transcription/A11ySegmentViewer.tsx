import { useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Rewind,
  FastForward,
  Repeat,
} from 'lucide-react';
import type { ClozeSegment } from '@/lib/cloze-block';
import type { TranscriptSegment } from '@/lib/api/transcription';

type Props = {
  rawSegments: TranscriptSegment[];
  clozeSegments: ClozeSegment[];
  segmentLoopStartIdx: number;
  segmentLoopCount: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSkipSeconds: (seconds: number) => void;
  onPrevSegment: () => void;
  onNextSegment: () => void;
  onReplayLoop: () => void;
};

/**
 * Accessibility-first viewer for blind / low-vision users.
 *
 * Layout: fixed top header, scrollable middle (current segment text only),
 * sticky bottom control bar with a fixed 6-column grid so each button's
 * position never shifts when state changes.
 *
 * The video is hidden by the parent; this component drives audio via the
 * play/skip callbacks.
 */
export function A11ySegmentViewer({
  rawSegments,
  clozeSegments,
  segmentLoopStartIdx,
  segmentLoopCount,
  isPlaying,
  onTogglePlay,
  onSkipSeconds,
  onPrevSegment,
  onNextSegment,
  onReplayLoop,
}: Props) {
  const total = rawSegments.length;
  const endIdx = Math.min(segmentLoopStartIdx + segmentLoopCount - 1, total - 1);
  const visible = clozeSegments.slice(segmentLoopStartIdx, endIdx + 1);

  // Announce segment changes for screen readers.
  const liveRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!liveRef.current) return;
    liveRef.current.textContent = `Câu ${segmentLoopStartIdx + 1} trên ${total}`;
  }, [segmentLoopStartIdx, total]);

  return (
    <div className="h-full w-full flex flex-col bg-background text-foreground">
      {/* Header — fixed height, never shifts */}
      <div
        className="h-14 flex items-center justify-center border-b border-border px-4 shrink-0"
        role="status"
        aria-live="polite"
      >
        <span className="text-base font-bold">
          Câu {segmentLoopStartIdx + 1}
          {segmentLoopCount > 1 ? `–${endIdx + 1}` : ''} / {total}
        </span>
      </div>

      {/* SR-only live region for announcements */}
      <div ref={liveRef} className="sr-only" aria-live="polite" aria-atomic="true" />

      {/* Transcript — scrollable middle */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-6">
        <div
          lang="ja"
          className="max-w-2xl mx-auto space-y-5 text-2xl leading-relaxed font-medium"
        >
          {visible.length === 0 ? (
            <p className="text-muted-foreground text-base text-center">
              Đang tải transcript…
            </p>
          ) : (
            visible.map((cs, i) => {
              const text = cs.tokens.map((t) => t.word.token).join('');
              return (
                <p key={segmentLoopStartIdx + i} className="text-foreground">
                  {text}
                </p>
              );
            })
          )}
        </div>
      </div>

      {/* Control bar — fixed 6-column grid, never reflows */}
      <div
        className="border-t border-border bg-card shrink-0"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div
          className="grid grid-cols-6 gap-1 p-2"
          role="toolbar"
          aria-label="Điều khiển phát"
        >
          <CtlButton
            label="Câu trước"
            onClick={onPrevSegment}
            disabled={segmentLoopStartIdx <= 0}
          >
            <SkipBack className="w-7 h-7" />
          </CtlButton>

          <CtlButton label="Lùi 5 giây" onClick={() => onSkipSeconds(-5)}>
            <Rewind className="w-7 h-7" />
          </CtlButton>

          <CtlButton
            label={isPlaying ? 'Tạm dừng' : 'Phát'}
            onClick={onTogglePlay}
            primary
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 fill-current" />
            ) : (
              <Play className="w-8 h-8 fill-current" />
            )}
          </CtlButton>

          <CtlButton label="Tiến 5 giây" onClick={() => onSkipSeconds(5)}>
            <FastForward className="w-7 h-7" />
          </CtlButton>

          <CtlButton
            label="Câu sau"
            onClick={onNextSegment}
            disabled={endIdx >= total - 1}
          >
            <SkipForward className="w-7 h-7" />
          </CtlButton>

          <CtlButton label="Lặp lại đoạn" onClick={onReplayLoop}>
            <Repeat className="w-7 h-7" />
          </CtlButton>
        </div>
      </div>
    </div>
  );
}

function CtlButton({
  label,
  onClick,
  disabled,
  primary,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex items-center justify-center rounded-xl min-h-16 w-full transition-colors
        focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/60
        disabled:opacity-40 disabled:cursor-not-allowed
        ${
          primary
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'bg-muted text-foreground hover:bg-muted/70'
        }`}
    >
      {children}
    </button>
  );
}
