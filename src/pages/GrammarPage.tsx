import { useEffect, useState } from 'react';
import { getDueGrammarCards, reviewGrammarCard } from '@/lib/api/grammar';
import type { GrammarCard, SRSRating } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

export default function GrammarPage() {
  const [cards, setCards] = useState<GrammarCard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadCards = () => {
    setLoading(true);
    getDueGrammarCards().then(c => { setCards(c); setCurrentIdx(0); setShowAnswer(false); setLoading(false); });
  };

  useEffect(() => { loadCards(); }, []);

  const handleRate = async (rating: SRSRating) => {
    await reviewGrammarCard(cards[currentIdx].id, rating);
    setShowAnswer(false);
    if (currentIdx + 1 < cards.length) setCurrentIdx(currentIdx + 1);
    else loadCards();
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Đang tải...</div>;

  const card = cards[currentIdx];

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h2 className="font-display font-bold text-2xl text-foreground mb-1">Ngữ pháp</h2>
        <p className="text-sm text-muted-foreground">Ôn tập ngữ pháp tiếng Nhật với thuật toán lặp lại ngắt quãng.</p>
      </div>

      {cards.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg mb-2">🎉 Đã ôn hết!</p>
          <p className="text-sm mb-4">Không có thẻ ngữ pháp nào cần ôn.</p>
          <Button variant="outline" size="sm" onClick={loadCards} className="gap-1">
            <RotateCcw className="w-3 h-3" /> Tải lại
          </Button>
        </div>
      ) : (
        <div>
          <div className="text-xs font-mono text-muted-foreground mb-3">
            {currentIdx + 1} / {cards.length} · {card.level}
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            {/* Front: pattern */}
            <div className="text-center mb-4">
              <p className="text-2xl font-display font-bold text-primary mb-2">{card.pattern}</p>
              <p className="text-sm text-muted-foreground">{card.meaning}</p>
            </div>

            {showAnswer ? (
              <div className="mt-4 pt-4 border-t border-border space-y-3 animate-fade-in">
                <div className="bg-muted/50 rounded-lg p-4">
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
                      className="capitalize text-xs"
                    >
                      {r === 'again' ? 'Lại' : r === 'hard' ? 'Khó' : r === 'good' ? 'Tốt' : 'Dễ'}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <Button onClick={() => setShowAnswer(true)} className="w-full mt-4" variant="outline">
                Hiện đáp án
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
