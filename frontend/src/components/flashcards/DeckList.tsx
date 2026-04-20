import type { FlashcardTopic as Deck } from '@/lib/api/flashcard';
import { BookOpen } from 'lucide-react';

interface DeckListProps {
  topics: Deck[];
  onStartReview: (topicIds: string[]) => void;
  onToggleSelect: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
}

export function DeckList({ topics, onStartReview, onToggleSelect, onSelectAll }: DeckListProps) {
  const selectedCount = topics.filter(t => t.selected).length;
  const totalDue = topics.filter(t => t.selected).reduce((s, t) => s + (t.newCount + t.learningCount + t.reviewCount), 0);

  const handleReview = () => {
    const selectedIds = topics.filter(t => t.selected).map(t => t.id);
    onStartReview(selectedIds);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={selectedCount === topics.length && topics.length > 0} onChange={e => onSelectAll(e.target.checked)} className="rounded" />
          <span className="text-xs text-muted-foreground font-bold">{selectedCount}/{topics.length} chủ đề · {totalDue} cần ôn</span>
        </div>
        <button onClick={handleReview} disabled={totalDue === 0} className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-xl font-bold disabled:opacity-50">
          Ôn tập
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {topics.map(deck => (
          <div
            key={deck.id}
            className={`bg-card border rounded-2xl p-4 text-left transition-colors ${deck.selected ? 'border-primary/30' : 'border-border opacity-60'}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <input type="checkbox" checked={deck.selected} onChange={e => onToggleSelect(deck.id, e.target.checked)} className="rounded" />
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">{deck.name}</h3>
                <p className="text-xs text-muted-foreground font-mono">{deck.cardCount} thẻ</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {deck.newCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{deck.newCount} mới</span>
              )}
              {deck.learningCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-warning/10 text-warning font-bold">{deck.learningCount} đang học</span>
              )}
              {deck.reviewCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-bold">{deck.reviewCount} cần ôn</span>
              )}
              {deck.newCount === 0 && deck.learningCount === 0 && deck.reviewCount === 0 && (
                <span className="text-muted-foreground">{deck.cardCount} thẻ</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
