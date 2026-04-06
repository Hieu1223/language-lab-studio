import { useEffect, useState } from 'react';
import { getGrammarTopics, getDueGrammarCards, reviewGrammarCard, browseGrammar, addGrammarToTopic, toggleGrammarTopicSelection, selectAllGrammarTopics } from '@/lib/api/grammar';
import type { GrammarTopic, GrammarCard, GrammarListItem } from '@/lib/api/grammar';
import type { SRSRating, JLPTLevel } from '@/lib/api/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, BookText, RotateCcw, Search, Plus, Check } from 'lucide-react';

type Mode = 'topics' | 'review' | 'translate' | 'browse';

export default function GrammarPage() {
  const [topics, setTopics] = useState<GrammarTopic[]>([]);
  const [dueCards, setDueCards] = useState<GrammarCard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [mode, setMode] = useState<Mode>('topics');
  const [browseItems, setBrowseItems] = useState<GrammarListItem[]>([]);
  const [browseSearch, setBrowseSearch] = useState('');
  const [browseLevel, setBrowseLevel] = useState<JLPTLevel | 'all'>('all');

  useEffect(() => { getGrammarTopics('gcol-default').then(setTopics); }, []);

  const startReview = async (reviewMode: 'flashcard' | 'translate') => {
    const selectedIds = topics.filter(t => t.selected).map(t => t.id);
    const cards = await getDueGrammarCards(selectedIds);
    setDueCards(cards); setCurrentIdx(0); setShowAnswer(false);
    setMode(reviewMode === 'flashcard' ? 'review' : 'translate');
  };

  const handleRate = async (rating: SRSRating) => {
    await reviewGrammarCard(dueCards[currentIdx].id, rating);
    setShowAnswer(false);
    if (currentIdx + 1 < dueCards.length) setCurrentIdx(currentIdx + 1);
    else { setMode('topics'); getGrammarTopics('gcol-default').then(setTopics); }
  };

  const openBrowse = async () => {
    const result = await browseGrammar(1, 20, '', 'all');
    setBrowseItems(result.items); setMode('browse');
  };

  const handleBrowseSearch = async () => {
    const result = await browseGrammar(1, 20, browseSearch, browseLevel);
    setBrowseItems(result.items);
  };

  useEffect(() => { if (mode === 'browse') handleBrowseSearch(); }, [browseSearch, browseLevel]);

  const handleAddToTopic = async (grammarId: string) => {
    const targetTopic = topics.find(t => t.selected) || topics[0];
    if (!targetTopic) return;
    await addGrammarToTopic(grammarId, targetTopic.id);
    handleBrowseSearch();
  };

  const card = dueCards[currentIdx];
  const selectedCount = topics.filter(t => t.selected).length;
  const totalDue = topics.filter(t => t.selected).reduce((s, t) => s + t.dueCount, 0);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display font-bold text-2xl text-foreground mb-1">Ngữ pháp</h2>
          <p className="text-sm text-muted-foreground">Ôn tập ngữ pháp theo cấp JLPT.</p>
        </div>
        <Button variant="outline" size="sm" onClick={openBrowse} className="gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" /> Thêm ngữ pháp
        </Button>
      </div>

      {mode === 'topics' && (
        <>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={selectedCount === topics.length} onChange={e => { selectAllGrammarTopics('gcol-default', e.target.checked); getGrammarTopics('gcol-default').then(setTopics); }} className="rounded" />
              <span className="text-xs text-muted-foreground font-bold">{selectedCount}/{topics.length} chủ đề · {totalDue} cần ôn</span>
            </div>
            <div className="flex gap-1.5">
              <Button size="sm" onClick={() => startReview('flashcard')} disabled={totalDue === 0} className="text-xs rounded-xl gap-1">
                <BookText className="w-3.5 h-3.5" /> Flashcard
              </Button>
              <Button size="sm" variant="outline" onClick={() => startReview('translate')} disabled={totalDue === 0} className="text-xs rounded-xl">
                Dịch VN→JP
              </Button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {topics.map(topic => (
              <div key={topic.id} className={`bg-card border rounded-2xl p-3 ${topic.selected ? 'border-primary/30' : 'border-border opacity-60'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <input type="checkbox" checked={topic.selected} onChange={e => { toggleGrammarTopicSelection(topic.id, e.target.checked); getGrammarTopics('gcol-default').then(setTopics); }} className="rounded" />
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookText className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">{topic.name}</h3>
                    <p className="text-[10px] text-muted-foreground font-mono">{topic.cardCount} mẫu</p>
                  </div>
                </div>
                <div className="flex gap-1.5 text-[10px]">
                  {topic.newCount > 0 && <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{topic.newCount} mới</span>}
                  {topic.learningCount > 0 && <span className="px-1.5 py-0.5 rounded-full bg-warning/10 text-warning font-bold">{topic.learningCount} đang học</span>}
                  {topic.dueCount > 0 && <span className="px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-bold">{topic.dueCount} cần ôn</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {(mode === 'review' || mode === 'translate') && (
        <div>
          <Button variant="ghost" size="sm" onClick={() => setMode('topics')} className="mb-4 text-muted-foreground gap-1">
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </Button>
          {dueCards.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground"><p className="text-lg mb-2">🎉 Đã ôn hết!</p></div>
          ) : (
            <div className="max-w-md mx-auto">
              <div className="text-xs font-mono text-muted-foreground mb-3 text-center">{currentIdx + 1} / {dueCards.length} · {card.level}</div>
              <div className="bg-card border border-border rounded-2xl p-6 text-center">
                <p className="text-2xl font-display font-bold text-primary mb-2">{card.pattern}</p>
                <p className="text-sm text-muted-foreground">{card.meaning}</p>
                {showAnswer ? (
                  <div className="mt-4 pt-4 border-t border-border space-y-3 animate-fade-in">
                    <div className="bg-muted/50 rounded-xl p-4">
                      <p className="text-foreground text-lg mb-1">{card.example}</p>
                      <p className="text-sm text-muted-foreground">{card.exampleTranslation}</p>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {(['again', 'hard', 'good', 'easy'] as SRSRating[]).map(r => (
                        <Button key={r} variant={r === 'again' ? 'destructive' : r === 'easy' ? 'default' : 'outline'} size="sm" onClick={() => handleRate(r)} className="text-xs rounded-xl font-bold">
                          {r === 'again' ? 'Lại' : r === 'hard' ? 'Khó' : r === 'good' ? 'Tốt' : 'Dễ'}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Button onClick={() => setShowAnswer(true)} className="w-full mt-4 rounded-xl font-bold" variant="outline">Hiện đáp án</Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'browse' && (
        <div>
          <Button variant="ghost" size="sm" onClick={() => setMode('topics')} className="mb-4 text-muted-foreground gap-1">
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </Button>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={browseSearch} onChange={e => setBrowseSearch(e.target.value)} placeholder="Tìm ngữ pháp..." className="pl-9 bg-card border-border rounded-xl" />
            </div>
            <select value={browseLevel} onChange={e => setBrowseLevel(e.target.value as JLPTLevel | 'all')} className="text-xs bg-card border border-border rounded-xl px-3 text-foreground">
              <option value="all">Tất cả</option>
              {(['N5', 'N4', 'N3', 'N2', 'N1'] as JLPTLevel[]).map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            {browseItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-xl">
                <div>
                  <span className="font-bold text-sm text-foreground">{item.pattern}</span>
                  <span className="text-xs text-muted-foreground ml-2">{item.meaning}</span>
                  <span className="text-[10px] ml-2 px-1.5 py-0.5 bg-muted rounded-full text-muted-foreground">{item.level}</span>
                </div>
                {item.addedToTopic ? (
                  <span className="text-xs text-primary font-bold flex items-center gap-1"><Check className="w-3 h-3" /> Đã thêm</span>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => handleAddToTopic(item.id)} className="text-xs gap-1 h-7">
                    <Plus className="w-3 h-3" /> Thêm
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
