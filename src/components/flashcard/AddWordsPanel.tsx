import { Loader2, Search, Wand2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useLookup } from '@/common/DictionaryLookupOverlay/useLookup';
import { AddToDeckDialog } from '@/components/dictionary/AddToDeckDialog';
import { TokenizeSentencePanel } from '@/components/dictionary/TokenizedSentence';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { WordLookupEntry } from '@/lib/api/dictionary';

export function AddWordsPanel() {
  const { t } = useTranslation('flashcard');
  const { query, loading, error, results, lookup } = useLookup(30);
  const [q, setQ] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [single, setSingle] = useState<WordLookupEntry | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    await lookup(q);
  };

  return (
    <Tabs defaultValue="dict">
      <TabsList className="mb-4">
        <TabsTrigger value="dict" data-testid="addwords-tab-dict">
          <Search className="w-3.5 h-3.5 mr-1.5" /> {t('add.tabDictionary')}
        </TabsTrigger>
        <TabsTrigger value="sentence" data-testid="addwords-tab-sentence">
          <Wand2 className="w-3.5 h-3.5 mr-1.5" /> {t('add.tabSentence')}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="dict">
        <div className="space-y-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('add.searchPlaceholder')}
              className="flex-1"
            />
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </form>
          {error && (
            <p className="text-xs text-destructive" data-testid="lookup-error">
              {error}
            </p>
          )}
          {results.length > 0 && (
            <>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t('add.resultCount', { count: results.length })}</span>
                <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
                  {t('add.addAll')}
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                {results.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => setSingle(w)}
                    className="text-left rounded-lg border bg-card p-3 hover:border-primary/60 transition-colors"
                  >
                    <p className="font-bold font-japanese">{w.word}</p>
                    <p className="text-xs text-muted-foreground font-japanese">
                      {w.reading}
                    </p>
                    <p className="text-xs mt-1 line-clamp-2">{w.meaning}</p>
                  </button>
                ))}
              </div>
              <AddToDeckDialog
                open={bulkOpen}
                onOpenChange={setBulkOpen}
                words={results}
                title={query ? t('add.addResultsTitle', { query }) : undefined}
              />
              <AddToDeckDialog
                open={!!single}
                onOpenChange={(o) => !o && setSingle(null)}
                words={single ? [single] : []}
                title={single ? t('add.addSingleTitle', { word: single.word }) : undefined}
              />
            </>
          )}
        </div>
      </TabsContent>

      <TabsContent value="sentence">
        <TokenizeSentencePanel initialText="" />
      </TabsContent>
    </Tabs>
  );
}

export default AddWordsPanel;
