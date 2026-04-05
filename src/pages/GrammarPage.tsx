import { useEffect, useState } from 'react';
import { getGrammarDecks, getDueGrammarCards, reviewGrammarCard } from '@/lib/api/grammar';
import type { GrammarDeck, GrammarCard, SRSRating } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookText, RotateCcw } from 'lucide-react';

export default function GrammarPage() {
  const [decks, setDecks] = useState<GrammarDeck[]>([]);
  const [dueCards, setDueCards] = useState<GrammarCard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [mode, setMode] = useState<'decks' | 'review'>('decks');

  useEffect(() => { getGrammarDecks().then(setDecks); }, []);

  const startReview = async (deckId: string) => {
    const cards = await getDueGrammarCards(deckId);
    setDueCards(cards);
    setCurrentIdx(0);
    setShowAnswer(false);
    setMode('review');
  };

  const handleRate = async (rating: SRSRating) => {
    await reviewGrammarCard(dueCards[currentIdx].id, rating);
    setShowAnswer(false);
    if (currentIdx + 1 < dueCards.length) setCurrentIdx(currentIdx + 1);
    else { setMode('decks'); getGrammarDecks().then(setDecks); }
  };

  const card = dueCards[currentIdx];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h2 className="font-display font-bold text-2xl text-foreground mb-1">Ngữ pháp</h2>
        <p className="text-sm text-muted-foreground">Ôn tập ngữ pháp tiếng Nhật theo cấp độ JLPT.</p>
      </div>

      {mode === 'decks' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {decks.map(deck => (
            <button
              key={deck.id}
              onClick={() => startReview(deck.id)}
              className="bg-card border border-border rounded-2xl p-4 text-left hover:border-primary/40 transition-colors group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BookText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">{deck.name}</h3>
                  <p className="text-xs text-muted-foreground font-mono">{deck.cardCount} mẫu ngữ pháp</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {deck.newCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{deck.newCount} mới</span>
                )}
                {deck.learningCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-warning/10 text-warning font-bold">{deck.learningCount} đang học</span>
                )}
                {deck.dueCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-bold">{deck.dueCount} cần ôn</span>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div>
          <Button variant="ghost" size="sm" onClick={() => setMode('decks')} className="mb-4 text-muted-foreground gap-1">
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </Button>

          {dueCards.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-2">🎉 Đã ôn hết!</p>
              <p className="text-sm mb-4">Không có thẻ ngữ pháp nào cần ôn.</p>
              <Button variant="outline" size="sm" onClick={() => setMode('decks')} className="gap-1 rounded-xl">
                <RotateCcw className="w-3 h-3" /> Quay lại
              </Button>
            </div>
          ) : (
            <div className="max-w-md mx-auto">
              <div className="text-xs font-mono text-muted-foreground mb-3 text-center">
                {currentIdx + 1} / {dueCards.length} · {card.level}
              </div>
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="text-center mb-4">
                  <p className="text-2xl font-display font-bold text-primary mb-2">{card.pattern}</p>
                  <p className="text-sm text-muted-foreground">{card.meaning}</p>
                </div>
                {showAnswer ? (
                  <div className="mt-4 pt-4 border-t border-border space-y-3 animate-fade-in">
                    <div className="bg-muted/50 rounded-xl p-4">
                      <p className="text-foreground text-lg mb-1">{card.example}</p>
                      <p className="text-sm text-muted-foreground">{card.exampleTranslation}</p>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mt-4">
                      {(['again', 'hard', 'good', 'easy'] as SRSRating[]).map(r => (
                        <Button
                          key={r}
                          variant={r === 'again' ? 'destructive' : r === 'easy' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleRate(r)}
                          className="text-xs rounded-xl font-bold"
                        >
                          {r === 'again' ? 'Lại' : r === 'hard' ? 'Khó' : r === 'good' ? 'Tốt' : 'Dễ'}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Button onClick={() => setShowAnswer(true)} className="w-full mt-4 rounded-xl font-bold" variant="outline">
                    Hiện đáp án
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
