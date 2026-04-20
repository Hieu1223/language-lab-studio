export interface ClozeOptions {
  minGaps: number;
  maxGaps: number;
  minChars: number;
  maxChars: number;
}

export interface ClozeSegment {
  id: string;
  text: string;
  isCloze: boolean;
  originalText?: string;
}

export function generateClozes(
  text: string,
  options: ClozeOptions
): ClozeSegment[] {
  const { minGaps, maxGaps, minChars, maxChars } = options;

  // Split text into words
  const words = text.split(/(\s+)/);
  const numGaps = Math.floor(
    Math.random() * (maxGaps - minGaps + 1) + minGaps
  );

  // Select random word indices for clozing
  const wordIndices = new Set<number>();
  const nonWhitespaceIndices = words
    .map((w, i) => (w.trim() ? i : -1))
    .filter((i) => i !== -1);

  while (wordIndices.size < Math.min(numGaps, nonWhitespaceIndices.length)) {
    const randomIdx = nonWhitespaceIndices[
      Math.floor(Math.random() * nonWhitespaceIndices.length)
    ];
    wordIndices.add(randomIdx);
  }

  // Generate segments
  const segments: ClozeSegment[] = [];
  let segmentId = 0;

  words.forEach((word, idx) => {
    if (wordIndices.has(idx)) {
      const clozeLength = Math.floor(
        Math.random() * (maxChars - minChars + 1) + minChars
      );
      const originalText = word;
      const clozeText = '_'.repeat(Math.min(clozeLength, word.length));

      segments.push({
        id: `cloze-${segmentId++}`,
        text: clozeText,
        isCloze: true,
        originalText: originalText,
      });
    } else {
      segments.push({
        id: `text-${segmentId++}`,
        text: word,
        isCloze: false,
      });
    }
  });

  return segments;
}

export function regenerateClozes(
  segments: ClozeSegment[],
  options: ClozeOptions
): ClozeSegment[] {
  // Reconstruct original text
  const originalText = segments.map((s) => s.originalText || s.text).join('');
  // Generate new clozes
  return generateClozes(originalText, options);
}

export function revealAllClozes(segments: ClozeSegment[]): ClozeSegment[] {
  return segments.map((seg) => ({
    ...seg,
    text: seg.originalText || seg.text,
  }));
}

export function hideAllClozes(segments: ClozeSegment[]): ClozeSegment[] {
  return segments.map((seg) => {
    if (seg.isCloze && seg.originalText) {
      return {
        ...seg,
        text: '_'.repeat(seg.originalText.length),
      };
    }
    return seg;
  });
}
