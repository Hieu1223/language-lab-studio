import { TranscriptSegmentRow } from '@/components/transcription/TranscriptSegmentRow';
import type { TranscriptModeProps } from '@/components/transcription/TranscriptModeProps';

export const uiType = 'read' as const;
export const label = 'Read';
export const labelKey = 'transcription.settings.modeRead';

export default function ReadMode({
  clozeSegments,
  currentTime,
  activeSegIdx,
  activeSegRef,
  loopStart,
  loopEnd,
  highlightMode,
  onSeek,
}: TranscriptModeProps) {
  return (
    <>
      {clozeSegments.map((cs, si) => {
        const isActive = si === activeSegIdx;
        const segHasStart = loopStart != null && cs.tokens.some(
          (t) => t.word.start != null && Math.abs(t.word.start - loopStart) < 0.01,
        );
        const segHasEnd = loopEnd != null && cs.tokens.some(
          (t) => t.word.start != null && Math.abs(t.word.start - loopEnd) < 0.01,
        );
        return (
          <TranscriptSegmentRow
            key={si}
            cs={cs}
            isActive={isActive}
            showClozeMode={false}
            highlightMode={highlightMode}
            currentTime={isActive ? currentTime : 0}
            onSeek={onSeek}
            rowRef={isActive ? activeSegRef : undefined}
            loopStart={segHasStart ? loopStart : null}
            loopEnd={segHasEnd ? loopEnd : null}
            pickMode={null}
          />
        );
      })}
      <div className="h-32" />
    </>
  );
}
