/**
 * Block-based cloze generation:
 * Across a flat token sequence we alternate hide-N / show-M blocks,
 * where N and M are randomised per block within min/max bounds.
 *
 * This module works on the transcript segment shape used in the app.
 */

import type { TranscriptSegment } from './api/transcription-real';

type SegmentWord = TranscriptSegment['words'][number];

export interface BlockClozeOptions {
  minHidden: number;
  maxHidden: number;
  minVisible: number;
  maxVisible: number;
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
  minVisible: 2,
  maxVisible: 5,
  requireTimestamp: true,
};

function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function generateBlockCloze(
  segments: TranscriptSegment[],
  opts: BlockClozeOptions,
  seed: number,
): ClozeSegment[] {
  const rand = seededRandom(seed);
  const randInt = (min: number, max: number) => {
    const lo = Math.max(0, Math.min(min, max));
    const hi = Math.max(0, Math.max(min, max));
    return Math.floor(rand() * (hi - lo + 1)) + lo;
  };

  // Flatten tokens, track eligibility
  type Flat = {
    segIdx: number;
    wordIdx: number;
    eligible: boolean;
  };
  const flat: Flat[] = [];
  segments.forEach((seg, si) => {
    seg.words.forEach((w, wi) => {
      const eligible = opts.requireTimestamp
        ? w.start !== null && w.end !== null
        : true;
      flat.push({ segIdx: si, wordIdx: wi, eligible });
    });
  });

  const isCloze = new Array(flat.length).fill(false);
  let i = 0;
  while (i < flat.length) {
    const hideCount = randInt(opts.minHidden, opts.maxHidden);
    let hidden = 0;
    while (hidden < hideCount && i < flat.length) {
      if (flat[i].eligible) {
        isCloze[i] = true;
        hidden++;
      }
      i++;
    }
    // visible skip
    const showCount = randInt(opts.minVisible, opts.maxVisible);
    let visible = 0;
    while (visible < showCount && i < flat.length) {
      if (flat[i].eligible) visible++;
      i++;
    }
  }

  // Rebuild segment-shaped result
  let p = 0;
  return segments.map((seg) => ({
    segment: seg,
    tokens: seg.words.map((word, wi) => {
      const token: ClozeToken = {
        word,
        wordIndex: wi,
        isCloze: isCloze[p],
        revealed: false,
      };
      p++;
      return token;
    }),
  }));
}
