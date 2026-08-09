import type { TranscriptSegment } from '@/lib/api/transcription';

export type SegmentWord = TranscriptSegment['words'][number];

export interface ClozeToken {
  word: SegmentWord;
  isCloze: boolean;
  revealed: boolean;
  wordIndex: number;
}

export interface ClozeSegment {
  segment: TranscriptSegment;
  tokens: ClozeToken[];
}

export interface ClozeOptions {
  density: number;
  minChars: number;
}

/**
 * Marks a deterministic, pseudo-random subset of words as cloze blanks.
 *
 * A seeded LCG keeps the selection stable across re-renders, so the same
 * `seed` always produces the same blanks; bump the seed to reshuffle.
 * Only timed words (`start`/`end` present) of at least `minChars` alphanumeric
 * characters are eligible.
 */
export function generateClozeData(
  segments: TranscriptSegment[],
  opts: ClozeOptions,
  seed: number,
): ClozeSegment[] {
  let s = seed;

  const rand = () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 4294967296;
  };

  return segments.map((seg) => ({
    segment: seg,
    tokens: seg.words.map((word, wordIndex) => {
      const clean = word.token.trim().replace(/[^a-zA-Z0-9]/g, '');

      const isEligible =
        word.start !== null &&
        word.end !== null &&
        clean.length >= opts.minChars;

      return {
        word,
        wordIndex,
        isCloze: isEligible && rand() < opts.density,
        revealed: false,
      };
    }),
  }));
}
