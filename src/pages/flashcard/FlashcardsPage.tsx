import { Globe2, Library, Loader2, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { AddWordsPanel } from '@/components/flashcard/AddWordsPanel';
import { DecksPanel } from '@/components/flashcard/DecksPanel';
import { PublicDecksPanel } from '@/components/flashcard/PublicDecksPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getDecks, type DeckWithStatsResponse } from '@/lib/api/flashcard';
import { translate } from '@/lib/i18n-runtime';

export default function FlashcardsPage() {
  const { t } = useTranslation('flashcard');
  const [decks, setDecks] = useState<DeckWithStatsResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getDecks();
      setDecks(data);
    } catch {
      // `translate` (not `t`) keeps `load` stable for the mount-only effect.
      toast.error(translate('flashcard:add.decksLoadFailed', 'Không tải được danh sách bộ thẻ'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading && decks.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className="p-4 md:p-6 max-w-6xl mx-auto animate-fade-in"
      data-testid="flashcards-page"
    >

      <Tabs defaultValue="decks">
        <TabsList className="mb-3 grid grid-cols-2 md:grid-cols-3 w-full md:w-auto">
          <TabsTrigger value="decks" data-testid="tab-decks">
            <Library className="w-3.5 h-3.5 mr-1.5" /> {t('page.tabMyDecks')}
          </TabsTrigger>
          <TabsTrigger value="public" data-testid="tab-public">
            <Globe2 className="w-3.5 h-3.5 mr-1.5" /> {t('page.tabPublic')}
          </TabsTrigger>
          <TabsTrigger value="add" data-testid="tab-add">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> {t('page.tabAddWords')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="decks">
          <DecksPanel decks={decks} onChange={load} />
        </TabsContent>
        <TabsContent value="public">
          <PublicDecksPanel onChange={load} />
        </TabsContent>
        <TabsContent value="add">
          <AddWordsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
