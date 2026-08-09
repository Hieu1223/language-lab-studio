import { useTranslation } from 'react-i18next';
import { Repeat } from 'lucide-react';
import { TranscriptSegmentRow } from '@/components/transcription/TranscriptSegmentRow';
import { Button } from '@/components/ui/button';
import type { TranscriptModeProps } from '@/components/transcription/TranscriptModeProps';

export const uiType = 'anki' as const;
export const label = 'Anki';
export const labelKey = 'transcription.settings.modeAnki';

export default function AnkiMode({
  clozeSegments,
  rawSegments,
  currentTime,
  activeSegIdx,
  activeSegRef,
  highlightMode,
  segmentLoopStartIdx,
  onSeek,
  playSegmentCard,
}: TranscriptModeProps) {
  const { t } = useTranslation('transcription');
  const cs = clozeSegments[segmentLoopStartIdx];
  const isActive = segmentLoopStartIdx === activeSegIdx;
  const goTo = (idx: number) => playSegmentCard(idx);
  const handleRepeat = () => playSegmentCard(segmentLoopStartIdx);

  return (
    <div className="flex flex-col gap-4">
      {cs ? (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-8 shadow-sm min-h-[40vh] flex items-center justify-center">
          <div className="w-full" lang="ja">
            <TranscriptSegmentRow
              cs={cs}
              isActive={isActive}
              showClozeMode={false}
              highlightMode={highlightMode}
              currentTime={isActive ? currentTime : 0}
              onSeek={onSeek}
              rowRef={isActive ? activeSegRef : undefined}
            />
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">{t('transcript.noSentences')}</div>
      )}

      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] border-t border-border">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="lg"
            className="min-h-14 text-sm sm:text-base gap-2"
            onClick={() => goTo(segmentLoopStartIdx - 1)}
            disabled={segmentLoopStartIdx === 0}
            aria-label={t('anki.prevSentence')}
          >
            {t('anki.prev')}
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="min-h-14 text-sm sm:text-base gap-2"
            onClick={handleRepeat}
            aria-label={t('anki.repeat')}
          >
            <Repeat className="w-5 h-5" />
            {t('anki.repeatShort')}
          </Button>
          <Button
            variant="default"
            size="lg"
            className="min-h-14 text-sm sm:text-base gap-2"
            onClick={() => goTo(segmentLoopStartIdx + 1)}
            disabled={segmentLoopStartIdx >= rawSegments.length - 1}
            aria-label={t('anki.nextSentence')}
          >
            {t('anki.next')}
          </Button>
        </div>
        <div className="text-center text-xs text-muted-foreground mt-2" aria-live="polite">
          {t('anki.counter', {
            current: segmentLoopStartIdx + 1,
            total: rawSegments.length,
          })}
        </div>
      </div>
    </div>
  );
}
