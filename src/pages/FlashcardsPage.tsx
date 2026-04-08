import { useEffect, useState } from 'react';
import { getAllTopics, getDueCards, reviewCard, toggleTopicSelection, selectAllTopics, addCard, getFieldConfig } from '@/lib/api/flashcard';
import type { FlashcardTopic, Flashcard, FlashcardFieldConfig } from '@/lib/api/flashcard';
import type { SRSRating } from '@/lib/api/common';
import { tokenizeText } from '@/lib/api/transcription';
import type { TokenInfo } from '@/lib/api/transcription';
import { DeckList } from '@/components/flashcards/DeckList';
import { FlashcardReview } from '@/components/flashcards/FlashcardReview';
import { Button } from '@/components/ui/button';
import { Plus, Type, X, Check } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

const USER_ID = 'current-user';

export default function FlashcardsPage() {
  const [topics, setTopics] = useState<FlashcardTopic[]>([]);
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [addText, setAddText] = useState('');
  const [tokenizedTokens, setTokenizedTokens] = useState<TokenInfo[]>([]);
  const [selectedTokens, setSelectedTokens] = useState<Set<number>>(new Set());
  const [tokenizing, setTokenizing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [mode, setMode] = useState<'topics' | 'review'>('topics');
  const [undoStack, setUndoStack] = useState<{ card: Flashcard; idx: number }[]>([]);
  const [fieldConfig, setFieldConfig] = useState<FlashcardFieldConfig[]>([]);

  const reload = () => {
    getAllTopics(USER_ID).then(setTopics);
    getFieldConfig(USER_ID).then(setFieldConfig);
  };
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

  const handleTokenize = async () => {
    if (!addText.trim()) return;
    setTokenizing(true);
    const result = await tokenizeText(USER_ID, addText.trim());
    setTokenizedTokens(result.tokens);
    setSelectedTokens(new Set());
    setTokenizing(false);
  };

  const toggleToken = (idx: number) => {
    setSelectedTokens(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleAddSelected = async () => {
    setAdding(true);
    for (const idx of selectedTokens) {
      const token = tokenizedTokens[idx];
      await addCard(USER_ID, token.token, 'topic-noun', 'col-default');
    }
    setAdding(false);
    setShowAdd(false);
    setAddText('');
    setTokenizedTokens([]);
    setSelectedTokens(new Set());
    reload();
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
          <p className="text-xs text-muted-foreground mb-2">Nhập đoạn văn bản tiếng Nhật, hệ thống sẽ tách từ và bạn chọn từ muốn thêm.</p>
          <Textarea value={addText} onChange={e => setAddText(e.target.value)} placeholder="Nhập đoạn văn bản tiếng Nhật..." className="bg-background border-border rounded-xl mb-2 min-h-[80px]" />
          <div className="flex gap-2 mb-3">
            <Button onClick={handleTokenize} size="sm" disabled={!addText.trim() || tokenizing} className="gap-1">
              <Type className="w-3 h-3" /> {tokenizing ? 'Đang tách từ...' : 'Tách từ'}
            </Button>
            <Button onClick={() => { setShowAdd(false); setTokenizedTokens([]); setSelectedTokens(new Set()); }} variant="ghost" size="sm">Huỷ</Button>
          </div>

          {tokenizedTokens.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Chọn các từ muốn thêm vào flashcard:</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {tokenizedTokens.map((token, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleToken(idx)}
                    className={`px-2.5 py-1.5 rounded-lg text-sm border transition-colors ${
                      selectedTokens.has(idx)
                        ? 'bg-primary text-primary-foreground border-primary font-bold'
                        : 'bg-muted text-foreground border-border hover:border-primary/40'
                    }`}
                  >
                    <span className="font-bold">{token.token}</span>
                    <span className="text-[10px] ml-1 opacity-70">{token.partOfSpeech}</span>
                  </button>
                ))}
              </div>
              {selectedTokens.size > 0 && (
                <Button onClick={handleAddSelected} size="sm" disabled={adding} className="gap-1">
                  <Check className="w-3 h-3" /> Thêm {selectedTokens.size} từ đã chọn
                </Button>
              )}
            </div>
          )}
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
