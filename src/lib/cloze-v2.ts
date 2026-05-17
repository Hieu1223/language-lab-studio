/**
 * New cloze deletion logic:
 * Hide n consecutive tokens, then m visible tokens, then repeat
 * Both n and m are randomized within min/max bounds
 */

export interface ClozeV2Options {
  minHiddenTokens: number;
  maxHiddenTokens: number;
  minVisibleTokens: number;
  maxVisibleTokens: number;
}

export interface ClozeV2Token {
  text: string;
  isCloze: boolean;
  revealed: boolean;
  index: number;
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateClozeV2(
  tokens: string[],
  options: ClozeV2Options
): ClozeV2Token[] {
  const result: ClozeV2Token[] = [];
  let i = 0;

  while (i < tokens.length) {
    // Randomize hidden and visible counts for this cycle
    const hiddenCount = getRandomInt(options.minHiddenTokens, options.maxHiddenTokens);
    const visibleCount = getRandomInt(options.minVisibleTokens, options.maxVisibleTokens);

    // Add hidden tokens
    for (let h = 0; h < hiddenCount && i < tokens.length; h++, i++) {
      result.push({
        text: tokens[i],
        isCloze: true,
        revealed: false,
        index: i,
      });
    }

    // Add visible tokens
    for (let v = 0; v < visibleCount && i < tokens.length; v++, i++) {
      result.push({
        text: tokens[i],
        isCloze: false,
        revealed: false,
        index: i,
      });
    }
  }

  return result;
}

export function toggleClozeToken(
  tokens: ClozeV2Token[],
  index: number
): ClozeV2Token[] {
  return tokens.map((t) =>
    t.index === index ? { ...t, revealed: !t.revealed } : t
  );
}

export function revealAllClozes(tokens: ClozeV2Token[]): ClozeV2Token[] {
  return tokens.map((t) => (t.isCloze ? { ...t, revealed: true } : t));
}

export function hideAllClozes(tokens: ClozeV2Token[]): ClozeV2Token[] {
  return tokens.map((t) => (t.isCloze ? { ...t, revealed: false } : t));
}

export function regenerateClozes(
  tokens: ClozeV2Token[],
  options: ClozeV2Options
): ClozeV2Token[] {
  const texts = tokens.map((t) => t.text);
  return generateClozeV2(texts, options);
}
