import { depLinkToToken, type DependencyTree, type Token } from '@/lib/api/dictionary';
import type { OCRBlock } from '@/lib/api/manga';

/**
 * The OCR payload now ships GiNZA analysis with every block (`analyze` is one
 * `DependencyTree[]` per line), so the reader never has to call the tokenizer
 * for freshly OCR'd chapters. Flatten it to a single sentence list.
 */
export function blockTrees(block: OCRBlock | undefined | null): DependencyTree[] {
  if (!block?.analyze) return [];
  return block.analyze.flat();
}

/** Tokens for a block, derived from its embedded dependency analysis. */
export function treesToTokens(trees: DependencyTree[]): Token[] {
  return trees.flatMap((tree) => tree.tokens.map((link) => depLinkToToken(link, tree.sentence_id)));
}
