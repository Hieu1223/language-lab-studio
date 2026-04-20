import { useEffect, useState } from 'react';
import { getDecks, getNextCard, submitReview, addCard, type Card, type Deck, type ReviewRating } from '@/lib/api/flashcard-real';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card as UICard, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';

interface ReviewSession {
  card: Card;
  deckId: string;
  cardNumber: number;
  totalCards: number;
}

export default function FlashcardsPage() {
  const { user } = useAuth();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [currentSession, setCurrentSession] = useState<ReviewSession | null>(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [selectedDeckId, setSelectedDeckId] = useState<string>('');
  const [newCardFront, setNewCardFront] = useState('');
  const [newCardBack, setNewCardBack] = useState('');
  const [addingCard, setAddingCard] = useState(false);

  // Load decks on mount
  useEffect(() => {
    loadDecks();
  }, []);

  const loadDecks = async () => {
    try {
      setLoading(true);
      const data = await getDecks();
      setDecks(data);
    } catch (error) {
      toast.error('Failed to load decks');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const startReview = async (deckId: string) => {
    try {
      setReviewing(true);
      const card = await getNextCard(deckId);
      if (!card) {
        toast.success('No cards to review in this deck!');
        return;
      }
      setCurrentSession({
        card,
        deckId,
        cardNumber: 1,
        totalCards: 1, // We don't know the total, so we'll just show 1
      });
    } catch (error) {
      toast.error('Failed to start review');
      console.error(error);
    } finally {
      setReviewing(false);
    }
  };

  const handleReview = async (rating: ReviewRating) => {
    if (!currentSession || !user) return;

    try {
      setReviewing(true);
      await submitReview(currentSession.card.id, user.id, rating);
      
      // Get next card
      const nextCard = await getNextCard(currentSession.deckId);
      if (nextCard) {
        setCurrentSession({
          ...currentSession,
          card: nextCard,
          cardNumber: currentSession.cardNumber + 1,
        });
      } else {
        toast.success('All cards reviewed!');
        setCurrentSession(null);
        await loadDecks();
      }
    } catch (error) {
      toast.error('Failed to submit review');
      console.error(error);
    } finally {
      setReviewing(false);
    }
  };

  const handleAddCard = async () => {
    if (!newCardFront.trim() || !newCardBack.trim() || !selectedDeckId) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setAddingCard(true);
      await addCard(newCardFront, newCardBack, selectedDeckId);
      toast.success('Card added!');
      setNewCardFront('');
      setNewCardBack('');
      setShowAddCard(false);
      await loadDecks();
    } catch (error) {
      toast.error('Failed to add card');
      console.error(error);
    } finally {
      setAddingCard(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (currentSession) {
    const { card, cardNumber, totalCards } = currentSession;
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => setCurrentSession(null)}>
            ← Back to Decks
          </Button>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="mb-4 text-sm text-muted-foreground text-center">
            Card {cardNumber} of {totalCards}
          </div>

          <UICard className="mb-6 border-2 border-primary/20">
            <CardContent className="pt-8">
              <div className="mb-6">
                <h3 className="text-sm text-muted-foreground mb-2">Front (Front Side)</h3>
                <p className="text-3xl font-bold text-center text-foreground break-words">{card.front}</p>
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="text-sm text-muted-foreground mb-2">Back (Definition)</h3>
                <p className="text-lg text-foreground break-words">{card.back}</p>
              </div>
            </CardContent>
          </UICard>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handleReview('again')}
              disabled={reviewing}
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50"
              size="lg"
            >
              Again
            </Button>
            <Button
              onClick={() => handleReview('hard')}
              disabled={reviewing}
              variant="outline"
              className="border-orange-200 text-orange-600 hover:bg-orange-50"
              size="lg"
            >
              Hard
            </Button>
            <Button
              onClick={() => handleReview('good')}
              disabled={reviewing}
              variant="outline"
              className="border-yellow-200 text-yellow-600 hover:bg-yellow-50"
              size="lg"
            >
              Good
            </Button>
            <Button
              onClick={() => handleReview('easy')}
              disabled={reviewing}
              variant="outline"
              className="border-green-200 text-green-600 hover:bg-green-50"
              size="lg"
            >
              Easy
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display font-bold text-2xl text-foreground mb-1">Từ vựng</h2>
          <p className="text-sm text-muted-foreground">Ôn tập các flashcard của bạn</p>
        </div>
        <Button onClick={() => setShowAddCard(!showAddCard)} className="gap-2">
          <Plus className="w-4 h-4" />
          Thêm từ
        </Button>
      </div>

      {/* Add Card Form */}
      {showAddCard && (
        <UICard className="mb-6">
          <CardHeader>
            <CardTitle>Thêm từ mới</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {decks.length === 0 ? (
              <p className="text-muted-foreground">Vui lòng tạo một bộ flashcard trước khi thêm từ.</p>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium">Chọn bộ</label>
                  <select
                    value={selectedDeckId}
                    onChange={(e) => setSelectedDeckId(e.target.value)}
                    className="w-full mt-2 px-3 py-2 border border-border rounded-lg bg-background"
                  >
                    <option value="">-- Select a deck --</option>
                    {decks.map((deck) => (
                      <option key={deck.id} value={deck.id}>
                        {deck.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Mặt trước (Kanji/Hiragana)</label>
                  <Input
                    placeholder="例: こんにちは"
                    value={newCardFront}
                    onChange={(e) => setNewCardFront(e.target.value)}
                    disabled={addingCard}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Mặt sau (Nghĩa)</label>
                  <Textarea
                    placeholder="Xin chào"
                    value={newCardBack}
                    onChange={(e) => setNewCardBack(e.target.value)}
                    disabled={addingCard}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleAddCard} disabled={addingCard}>
                    {addingCard ? 'Đang thêm...' : 'Thêm'}
                  </Button>
                  <Button onClick={() => setShowAddCard(false)} variant="outline">
                    Huỷ
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </UICard>
      )}

      {/* Decks List */}
      {decks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Chưa có bộ flashcard nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {decks.map((deck) => (
            <UICard key={deck.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle>{deck.name}</CardTitle>
                <CardDescription>{deck.cardCount} thẻ</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => startReview(deck.id)}
                  disabled={reviewing || deck.cardCount === 0}
                  className="w-full"
                >
                  {reviewing ? 'Đang tải...' : 'Ôn tập'}
                </Button>
              </CardContent>
            </UICard>
          ))}
        </div>
      )}
    </div>
  );
}
