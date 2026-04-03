import type { Deck } from '@/lib/api/types';
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
          className="bg-card border border-border rounded-lg p-4 text-left hover:border-primary/40 transition-colors group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground text-sm">{deck.name}</h3>
              <p className="text-xs text-muted-foreground font-mono">{deck.partOfSpeech}</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{deck.cardCount} cards</span>
            {deck.dueCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20 font-mono">
                {deck.dueCount} due
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
