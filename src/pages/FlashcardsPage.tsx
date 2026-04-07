import { useEffect, useState } from 'react';
import { getAllTopics, getDueCards, reviewCard, toggleTopicSelection, selectAllTopics, addCard } from '@/lib/api/flashcard';
import type { FlashcardTopic, Flashcard } from '@/lib/api/flashcard';
import type { SRSRating } from '@/lib/api/common';
import { DeckList } from '@/components/flashcards/DeckList';
import { FlashcardReview } from '@/components/flashcards/FlashcardReview';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';

const USER_ID = 'current-user';

export default function FlashcardsPage() {
  const [topics, setTopics] = useState<FlashcardTopic[]>([]);
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [addWord, setAddWord] = useState('');
  const [mode, setMode] = useState<'topics' | 'review'>('topics');
  const [undoStack, setUndoStack] = useState<{ card: Flashcard; idx: number }[]>([]);

  const reload = () => getAllTopics(USER_ID).then(setTopics);
  useEffect(() => { reload(); }, []);

  const startReview = async (topicIds: string[]) => {
    const cards = await getDueCards(USER_ID, topicIds);
    setDueCards(cards); setCurrentIdx(0); setUndoStack([]); setMode('review');
  };

  const handleRate = async (rating: SRSRating) => {
    if (currentIdx >= dueCards.length) return;
    const prev = dueCards[currentIdx];
    setUndoStack(s => [...s.slice(-19), { card: prev, idx: currentIdx }]);
    await reviewCard(USER_ID, dueCards[currentIdx].id, rating);
    if (currentIdx + 1 < dueCards.length) setCurrentIdx(currentIdx + 1);
    else { setMode('topics'); reload(); }
  };

  const handleUndo = () => {
    const last = undoStack[undoStack.length - 1];
    if (!last) return;
    setUndoStack(s => s.slice(0, -1));
    setCurrentIdx(last.idx);
    setDueCards(prev => prev.map((c, i) => i === last.idx ? last.card : c));
  };

  const handleAdd = async () => {
    if (!addWord.trim()) return;
    await addCard(USER_ID, addWord.trim(), topics[0]?.id || 'topic-noun', 'col-default');
    setAddWord(''); setShowAdd(false); reload();
  };

  useEffect(() => {
    if (mode !== 'review') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === '1') handleRate('again');
      else if (e.key === '2') handleRate('hard');
      else if (e.key === '3') handleRate('good');
      else if (e.key === '4') handleRate('easy');
      else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) handleUndo();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mode, currentIdx, dueCards, undoStack]);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display font-bold text-2xl text-foreground mb-1">Từ vựng</h2>
          <p className="text-sm text-muted-foreground">Chọn chủ đề để ôn tập.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowAdd(!showAdd)} className="gap-1.5">
          <Plus className="w-4 h-4" /> Thêm từ
        </Button>
      </div>

      {showAdd && (
        <div className="bg-card border border-border rounded-2xl p-4 mb-4">
          <p className="text-xs text-muted-foreground mb-2">Nhập từ tiếng Nhật — nghĩa tự động tạo.</p>
          <div className="flex gap-2">
            <Input value={addWord} onChange={e => setAddWord(e.target.value)} placeholder="Từ tiếng Nhật..." className="bg-background border-border rounded-xl" onKeyDown={e => e.key === 'Enter' && handleAdd()} />
            <Button onClick={handleAdd} size="sm" disabled={!addWord.trim()}>Thêm</Button>
            <Button onClick={() => setShowAdd(false)} variant="ghost" size="sm">Huỷ</Button>
          </div>
        </div>
      )}

      {mode === 'topics' ? (
        <DeckList
          topics={topics}
          onStartReview={startReview}
          onToggleSelect={async (id, sel) => { await toggleTopicSelection(USER_ID, id, sel); reload(); }}
          onSelectAll={async (sel) => { await selectAllTopics(USER_ID, 'col-default', sel); reload(); }}
        />
      ) : (
        <div>
          <div className="flex gap-2 mb-4">
            <Button variant="ghost" size="sm" onClick={() => setMode('topics')} className="text-muted-foreground">← Quay lại</Button>
            {undoStack.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleUndo} className="text-xs">↩ Quay lại (Ctrl+Z)</Button>
            )}
          </div>
          {dueCards.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-2">🎉 Đã ôn hết!</p>
            </div>
          ) : (
            <FlashcardReview card={dueCards[currentIdx]} progress={`${currentIdx + 1} / ${dueCards.length}`} onRate={handleRate} />
          )}
        </div>
      )}
    </div>
  );
}
