/**
 * Block-based cloze generation aligned to the frontend architecture doc
 * (§5.4 Cloze UI):
 *  - On mount / regenerate, randomly pick a subset of word tokens per segment
 *    to hide using `Math.random` (pure, client-only, no backend round-trip).
 *  - Clicking a token seeks the player to its `start` timestamp.
 *  - Hover reveals the hidden token (handled in the renderer).
 *
 * The `minHidden`/`maxHidden` bounds in `BlockClozeOptions` are interpreted
 * PER SEGMENT: each segment rolls its own hidden-token count within the range,
 * so "Regenerate" re-rolls independently per segment while keeping the same
 * word list.
 *
 * Works on the transcript segment shape exposed by `lib/api/transcription`.
 */

import type { TranscriptSegment } from './api/transcription';

type SegmentWord = TranscriptSegment['words'][number];

export interface BlockClozeOptions {
  minHidden: number;
  maxHidden: number;
  /** If true, only consider words with valid timestamps as eligible. */
  requireTimestamp?: boolean;
}

export interface ClozeToken {
  word: SegmentWord;
  wordIndex: number;
  isCloze: boolean;
  revealed: boolean;
}

export interface ClozeSegment {
  segment: TranscriptSegment;
  tokens: ClozeToken[];
}

export const DEFAULT_BLOCK_CLOZE_OPTIONS: BlockClozeOptions = {
  minHidden: 1,
  maxHidden: 3,
  requireTimestamp: true,
};

function randInt(min: number, max: number): number {
  const lo = Math.max(0, Math.min(min, max));
  const hi = Math.max(0, Math.max(min, max));
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function pickSubset(indices: number[], target: number): Set<number> {
  const chosen = new Set<number>();
  const pool = [...indices];
  const count = Math.min(target, pool.length);
  while (chosen.size < count && pool.length > 0) {
    const idx = pool.splice(randInt(0, pool.length - 1), 1)[0];
    chosen.add(idx);
  }
  return chosen;
}

/**
 * Build cloze segments from transcript segments. Hiding is decided per segment
 * with `Math.random`, so "Regenerate" produces a fresh, independent roll for
 * each segment while keeping the same word list.
 */
export function generateBlockCloze(
  segments: TranscriptSegment[],
  opts: BlockClozeOptions = DEFAULT_BLOCK_CLOZE_OPTIONS,
): ClozeSegment[] {
  return segments.map((seg) => {
    const eligible = seg.words
      .map((w, i) => ({ w, i }))
      .filter(({ w }) => (opts.requireTimestamp ? w.start !== null && w.end !== null : true))
      .map(({ i }) => i);

    const target = eligible.length === 0 ? 0 : randInt(opts.minHidden, opts.maxHidden);
    const hidden = pickSubset(eligible, target);

    return {
      segment: seg,
      tokens: seg.words.map((word, wi) => ({
        word,
        wordIndex: wi,
        isCloze: hidden.has(wi),
        revealed: false,
      })),
    };
  });
}

/** Re-roll the hidden set for an already-built list (used by "Regenerate"). */
export function regenerateBlockCloze(
  segments: ClozeSegment[],
  opts: BlockClozeOptions = DEFAULT_BLOCK_CLOZE_OPTIONS,
): ClozeSegment[] {
  return generateBlockCloze(
    segments.map((s) => s.segment),
    opts,
  );
}
