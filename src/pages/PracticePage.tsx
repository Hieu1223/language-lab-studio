import { useEffect, useState } from 'react';
import { getDueSentences, checkAnswer, reviewSentence } from '@/lib/api/sentence-practice';
import { canSpendCredits, spendCredits } from '@/lib/api/payment';
import type { SentencePractice, PracticeResult, SRSRating } from '@/lib/api/types';
import { SentenceCard } from '@/components/practice/SentenceCard';
import { ResultCard } from '@/components/practice/ResultCard';
import { UsageBadge } from '@/components/transcription/UsageBadge';
import { AlertCircle } from 'lucide-react';

export default function PracticePage() {
  const [sentences, setSentences] = useState<SentencePractice[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [creditError, setCreditError] = useState('');

  useEffect(() => {
    getDueSentences().then(s => { setSentences(s); setLoading(false); });
  }, []);

  const handleSubmit = async (answer: string) => {
    if (!sentences[currentIdx]) return;
    const cost = sentences[currentIdx].creditCost;
    const allowed = await canSpendCredits(cost);
    if (!allowed) {
      setCreditError(`Not enough credits (need ${cost}). Wait for daily refuel or upgrade.`);
      return;
    }
    setCreditError('');
    await spendCredits(cost);
    const res = await checkAnswer(sentences[currentIdx].id, answer);
    setResult(res);
  };

  const handleNext = async (rating: SRSRating) => {
    await reviewSentence(sentences[currentIdx].id, rating);
    setResult(null);
    if (currentIdx + 1 < sentences.length) {
      setCurrentIdx(currentIdx + 1);
    } else {
      const fresh = await getDueSentences();
      setSentences(fresh);
      setCurrentIdx(0);
    }
  };

  if (loading) return <div className="p-6 text-muted-foreground text-sm">Loading...</div>;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto animate-fade-in">
      <div className="mb-4">
        <h2 className="font-display font-bold text-2xl text-foreground mb-1">Sentence Practice</h2>
        <p className="text-sm text-muted-foreground">
          Translate Japanese sentences to English. AI checks your grammar. Costs credits per check.
        </p>
      </div>

      <div className="mb-4"><UsageBadge /></div>

      {creditError && (
        <div className="mb-4 flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {creditError}
        </div>
      )}

      {sentences.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg mb-2">🎉 All caught up!</p>
          <p className="text-sm">No sentences due for review.</p>
        </div>
      ) : (
        <div>
          <div className="text-xs font-mono text-muted-foreground mb-3">
            {currentIdx + 1} / {sentences.length}
          </div>
          {!result ? (
            <SentenceCard sentence={sentences[currentIdx]} onSubmit={handleSubmit} />
          ) : (
            <ResultCard result={result} onNext={handleNext} />
          )}
        </div>
      )}
    </div>
  );
}
