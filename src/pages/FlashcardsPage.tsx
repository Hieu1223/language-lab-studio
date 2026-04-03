import { useEffect, useState } from 'react';
import { getDecks, getDueCards, reviewCard } from '@/lib/api/flashcards';
import type { Deck, Flashcard, SRSRating } from '@/lib/api/types';
import { DeckList } from '@/components/flashcards/DeckList';
import { FlashcardReview } from '@/components/flashcards/FlashcardReview';
import { AddCardForm } from '@/components/flashcards/AddCardForm';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function FlashcardsPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null);
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [mode, setMode] = useState<'decks' | 'review'>('decks');

  useEffect(() => {
    getDecks().then(setDecks);
  }, []);

  const startReview = async (deckId: string) => {
    setSelectedDeck(deckId);
    const cards = await getDueCards(deckId);
    setDueCards(cards);
    setCurrentIdx(0);
    setMode('review');
  };

  const handleRate = async (rating: SRSRating) => {
    if (currentIdx >= dueCards.length) return;
    await reviewCard(dueCards[currentIdx].id, rating);
    if (currentIdx + 1 < dueCards.length) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setMode('decks');
      getDecks().then(setDecks);
    }
  };

  const handleCardAdded = () => {
    setShowAdd(false);
    getDecks().then(setDecks);
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display font-bold text-2xl text-foreground mb-1">Flashcards</h2>
          <p className="text-sm text-muted-foreground">Spaced repetition decks organized by part of speech.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowAdd(!showAdd)} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add Card
        </Button>
      </div>

      {showAdd && <AddCardForm onAdded={handleCardAdded} onCancel={() => setShowAdd(false)} />}

      {mode === 'decks' ? (
        <DeckList decks={decks} onStartReview={startReview} />
      ) : (
        <div>
          <Button variant="ghost" size="sm" onClick={() => setMode('decks')} className="mb-4 text-muted-foreground">
            ← Back to decks
          </Button>
          {dueCards.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-2">🎉 All caught up!</p>
              <p className="text-sm">No cards due in this deck.</p>
            </div>
          ) : (
            <FlashcardReview
              card={dueCards[currentIdx]}
              progress={`${currentIdx + 1} / ${dueCards.length}`}
              onRate={handleRate}
            />
          )}
        </div>
      )}
    </div>
  );
}
