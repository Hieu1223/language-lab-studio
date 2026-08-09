import { BookmarkPlus, BookOpen, Loader2, Search } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { useLookup } from '@/common/DictionaryLookupOverlay/useLookup';
import { AddToDeckDialog } from '@/components/dictionary/AddToDeckDialog';
import { WordCard } from '@/components/dictionary/WordCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function WordLookupPanel() {
  const { t } = useTranslation('dictionary');
  const [q, setQ] = useState('');
  const [searched, setSearched] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const { results, loading, error, lookup } = useLookup(40);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const query = q.trim();
    if (!query) return;
    setSearched(true);
    const found = await lookup(query);
    if (found.length === 0) toast.info(t('search.notFound'));
  };

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-4 px-4 sm:mx-0 sm:px-0 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b sm:border-0">
        <form onSubmit={handleSearch} className="flex gap-2" data-testid="word-search-form">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('search.placeholder')}
            className="font-japanese h-11 text-base sm:h-10 sm:text-sm"
            enterKeyHint="search"
            data-testid="word-search-input"
          />
          <Button
            type="submit"
            disabled={loading || !q.trim()}
            className="h-11 sm:h-10 px-4 shrink-0"
            data-testid="word-search-btn"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span className="ml-1.5 hidden sm:inline">{t('search.submit')}</span>
          </Button>
        </form>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {results.length > 1 && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{t('search.resultCount', { count: results.length })}</p>
          <Button size="sm" variant="outline" className="gap-1.5 h-9" onClick={() => setBulkOpen(true)}>
            <BookmarkPlus className="w-3.5 h-3.5" />
            {t('search.addAll')}
          </Button>
        </div>
      )}

      {loading && (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {!loading && searched && !error && results.length === 0 && (
        <div className="py-12 flex flex-col items-center gap-2 text-muted-foreground text-center">
          <BookOpen className="w-8 h-8 opacity-40" />
          <p className="text-sm">{t('search.empty')}</p>
        </div>
      )}

      {!loading && !searched && (
        <div className="py-12 flex flex-col items-center gap-2 text-muted-foreground text-center px-6">
          <BookOpen className="w-8 h-8 opacity-40" />
          <p className="text-sm max-w-xs leading-snug">{t('search.hint')}</p>
        </div>
      )}

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        {results.map((w, i) => (
          <WordCard key={`${w.id}-${i}`} word={w} index={i} />
        ))}
      </div>


      <AddToDeckDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        words={results}
        title={t('search.addToDeckTitle', { count: results.length })}
      />
    </div>
  );
}

export default WordLookupPanel;
