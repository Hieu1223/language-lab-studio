import type { PracticeResult, SRSRating } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  result: PracticeResult;
  onNext: (rating: SRSRating) => void;
}

export function ResultCard({ result, onNext }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-6"
    >
      <div className={`flex items-center gap-2 mb-4 ${result.isCorrect ? 'text-success' : 'text-destructive'}`}>
        {result.isCorrect ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
        <span className="font-display font-semibold">{result.isCorrect ? 'Correct!' : 'Not quite'}</span>
      </div>

      <p className="text-sm text-muted-foreground mb-2">{result.feedback}</p>

      <div className="bg-background border border-border-faint rounded-lg p-3 mb-4">
        <p className="text-xs font-mono text-muted-foreground mb-1">Your answer:</p>
        <p className="text-sm text-foreground">{result.userAnswer}</p>
      </div>

      {!result.isCorrect && (
        <div className="bg-background border border-border-faint rounded-lg p-3 mb-4">
          <p className="text-xs font-mono text-muted-foreground mb-1">Target:</p>
          <p className="text-sm text-primary">{result.targetSentence}</p>
        </div>
      )}

      {result.grammarNotes.length > 0 && !result.isCorrect && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground mb-2">
            <BookOpen className="w-3.5 h-3.5" /> Grammar Notes
          </div>
          <ul className="space-y-1">
            {result.grammarNotes.map((note, i) => (
              <li key={i} className="text-xs text-muted-foreground pl-3 border-l-2 border-primary/30">{note}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2 justify-center pt-2">
        {(['again', 'hard', 'good', 'easy'] as SRSRating[]).map(rating => (
          <Button key={rating} variant="outline" size="sm" onClick={() => onNext(rating)} className="capitalize">
            {rating}
          </Button>
        ))}
      </div>
    </motion.div>
  );
}
