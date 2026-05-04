import { useState } from 'react';
import { Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SentenceTokenizeDialog } from '@/components/dictionary/SentenceTokenizeDialog';
import type { ClozeSegment, ClozeToken } from '@/lib/cloze-block';
import type { HighlightMode } from '@/lib/settings-storage';

/**
 * A single cloze "word" inside the transcript. Behaviours:
 *  - Click  → seek the video to its start timestamp.
 *  - Hover  → reveal the cloze (without persisting). Leaving hides it again.
 *  - In Read mode (cloze off) the word is rendered plainly.
 */
export function TranscriptClozeWord({
  ct,
  isCurrent,
  isLoopStart,
  isLoopEnd,
  pickMode,
  showClozeMode,
  onSeek,
}: {
  ct: ClozeToken;
  isCurrent: boolean;
  isLoopStart?: boolean;
  isLoopEnd?: boolean;
  pickMode?: 'start' | 'end' | null;
  showClozeMode: boolean;
  onSeek?: (seconds: number) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const { word, isCloze, revealed } = ct;

  const base =
    'inline-block rounded px-1 mx-0.5 transition-all duration-150 select-none whitespace-pre cursor-pointer';

  const loopRing = isLoopStart
    ? 'ring-2 ring-emerald-500/80 bg-emerald-500/15'
    : isLoopEnd
    ? 'ring-2 ring-rose-500/80 bg-rose-500/15'
    : '';

  const pickPulse = pickMode ? 'outline-dashed outline-1 outline-primary/30' : '';

  const active = isCurrent
    ? 'bg-yellow-400/25 text-yellow-100 ring-1 ring-yellow-400/40'
    : '';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (word.start != null) onSeek?.(word.start);
  };

  // Read mode or non-cloze token → plain rendering with stronger hover
  if (!showClozeMode || !isCloze) {
    return (
      <span
        onClick={handleClick}
        className={`${base} ${active} ${loopRing} ${pickPulse} hover:bg-white/20 text-foreground`}
        title={word.start != null ? `→ ${word.start.toFixed(1)}s` : undefined}
      >
        {word.token}
      </span>
    );
  }

  // Cloze + revealed (toggled or hovered) → show actual word with strong colour
  const showWord = revealed || hovered;
  if (showWord) {
    return (
      <span
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`${base} ${
          revealed
            ? 'bg-green-900/40 text-green-300/90 border border-green-700/50'
            : 'bg-amber-900/40 text-amber-300/90 border border-amber-700/50'
        } ${active} ${loopRing} ${pickPulse}`}
        title={word.start != null ? `→ ${word.start.toFixed(1)}s` : undefined}
      >
        {word.token}
      </span>
    );
  }

  const isCJK = (ch: string) =>
    /[\u1100-\u115F\u2E80-\u303F\u3040-\u33FF\u3400-\u9FFF\uA000-\uA4CF\uAC00-\uD7AF\uF900-\uFAFF\uFE10-\uFE1F\uFE30-\uFE6F\uFF00-\uFFEF]/.test(ch);

  const clean = word.token.trim().replace(/[^\p{L}\p{N}]/gu, '');
  const displayWidth = [...clean].reduce((sum, ch) => sum + (isCJK(ch) ? 2 : 1), 0);
  const blanks = '＿'.repeat(Math.max(Math.ceil(displayWidth / 2), 1));

  return (
    <span
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`${base} bg-primary/20 text-transparent border-b border-primary/50
        hover:bg-primary/30 hover:border-primary/70 font-mono ${active} ${loopRing} ${pickPulse}`}
      title={word.start != null ? `→ ${word.start.toFixed(1)}s` : undefined}
    >
      {blanks}
    </span>
  );
}

/**
 * One transcript segment row with all words + a "tokenize sentence"
 * button. The transcript is character/word level; the API tokenize
 * endpoint will give us full word-level tokens for dictionary lookup.
 */
export function TranscriptSegmentRow({
  cs,
  isActive,
  showClozeMode,
  currentTime,
  onSeek,
  rowRef,
  highlightMode = 'token',
}: {
  cs: ClozeSegment;
  isActive: boolean;
  showClozeMode: boolean;
  currentTime: number;
  onSeek?: (seconds: number) => void;
  rowRef?: React.Ref<HTMLDivElement>;
  highlightMode?: HighlightMode;
}) {
  const [tokenizeOpen, setTokenizeOpen] = useState(false);

  const sentence = cs.tokens.map((t) => t.word.token).join('');

  const sentenceHighlight =
    highlightMode === 'sentence' && isActive
      ? 'bg-primary/8 border-primary/60 shadow-sm'
      : highlightMode === 'none'
      ? 'border-transparent hover:bg-white/3 hover:border-white/8'
      : isActive
      ? 'bg-primary/8 border-primary/60 shadow-sm'
      : 'border-transparent hover:bg-white/3 hover:border-white/8';

  return (
    <div
      ref={rowRef}
      className={`group transition-all duration-300 p-4 rounded-xl border-l-4 relative ${sentenceHighlight}`}
    >
      <p className="flex flex-wrap items-center leading-[2.2] text-base">
        {cs.tokens.map((ct, ti) => {
          const isCurrentToken =
            highlightMode === 'token' &&
            isActive &&
            ct.word.start !== null &&
            ct.word.end !== null &&
            currentTime >= ct.word.start &&
            currentTime <= ct.word.end;
          return (
            <TranscriptClozeWord
              key={ti}
              ct={ct}
              showClozeMode={showClozeMode}
              isCurrent={isCurrentToken}
              onSeek={onSeek}
            />
          );
        })}
      </p>

      <Button
        size="icon"
        variant="ghost"
        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Phân tích câu này thành từ"
        onClick={(e) => {
          e.stopPropagation();
          setTokenizeOpen(true);
        }}
        data-testid="segment-tokenize-btn"
      >
        <Wand2 className="w-3.5 h-3.5 text-primary" />
      </Button>

      <SentenceTokenizeDialog
        open={tokenizeOpen}
        onOpenChange={setTokenizeOpen}
        text={sentence}
      />
    </div>
  );
}