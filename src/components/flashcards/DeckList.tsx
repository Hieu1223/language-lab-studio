import type { FlashcardTopic as Deck } from '@/lib/api/flashcard';
import { BookOpen } from 'lucide-react';

interface DeckListProps {
  decks: Deck[];
  onStartReview: (deckId: string) => void;
}

export function DeckList({ decks, onStartReview }: DeckListProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {decks.map(deck => (
        <button
          key={deck.id}
          onClick={() => onStartReview(deck.id)}
          className="bg-card border border-border rounded-2xl p-4 text-left hover:border-primary/40 transition-colors group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">{deck.name}</h3>
              <p className="text-xs text-muted-foreground font-mono">{deck.partOfSpeech}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {deck.newCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{deck.newCount} mới</span>
            )}
            {deck.learningCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-warning/10 text-warning font-bold">{deck.learningCount} đang học</span>
            )}
            {deck.reviewCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-bold">{deck.reviewCount} cần ôn</span>
            )}
            {deck.newCount === 0 && deck.learningCount === 0 && deck.reviewCount === 0 && (
              <span className="text-muted-foreground">{deck.cardCount} thẻ</span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
