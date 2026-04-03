import { useState } from 'react';
import type { Flashcard, SRSRating } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface FlashcardReviewProps {
  card: Flashcard;
  progress: string;
  onRate: (rating: SRSRating) => void;
}

export function FlashcardReview({ card, progress, onRate }: FlashcardReviewProps) {
  const [flipped, setFlipped] = useState(false);

  const handleRate = (rating: SRSRating) => {
    setFlipped(false);
    onRate(rating);
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-3">
        <span className="text-xs font-mono text-muted-foreground">{progress}</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={card.id + (flipped ? '-back' : '-front')}
          initial={{ opacity: 0, rotateY: 90 }}
          animate={{ opacity: 1, rotateY: 0 }}
          exit={{ opacity: 0, rotateY: -90 }}
          transition={{ duration: 0.2 }}
        >
          <button
            onClick={() => setFlipped(!flipped)}
            className="w-full bg-card border border-border rounded-xl p-8 min-h-[200px] flex flex-col items-center justify-center cursor-pointer hover:border-primary/30 transition-colors"
          >
            <span className="text-xs font-mono text-muted-foreground mb-3 uppercase">
              {flipped ? 'Answer' : 'Question'}
            </span>
            <span className={`text-2xl font-display font-semibold ${flipped ? 'text-primary' : 'text-foreground'}`}>
              {flipped ? card.back : card.front}
            </span>
            {!flipped && card.reading && (
              <span className="text-sm text-muted-foreground mt-1">{card.reading}</span>
            )}
            <span className="text-xs text-muted-foreground mt-3 font-mono">{card.partOfSpeech}</span>
            {!flipped && (
              <span className="text-xs text-muted-foreground mt-4">tap to reveal</span>
            )}
          </button>
        </motion.div>
      </AnimatePresence>

      {flipped && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-2 mt-4 justify-center"
        >
          {(['again', 'hard', 'good', 'easy'] as SRSRating[]).map(rating => (
            <Button
              key={rating}
              variant="outline"
              size="sm"
              onClick={() => handleRate(rating)}
              className={`capitalize ${
                rating === 'again' ? 'hover:border-destructive/40 hover:text-destructive' :
                rating === 'easy' ? 'hover:border-success/40 hover:text-success' :
                'hover:border-primary/40'
              }`}
            >
              {rating}
            </Button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
