import { Copy as CopyIcon, Globe2, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  copyPublicDeck,
  getPublicDecks,
  type PublicDeckResponse,
} from '@/lib/api/flashcard';
import { translate } from '@/lib/i18n-runtime';

export interface PublicDecksPanelProps {
  onChange: () => void;
}

export function PublicDecksPanel({ onChange }: PublicDecksPanelProps) {
  const { t } = useTranslation('flashcard');
  const [decks, setDecks] = useState<PublicDeckResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [copying, setCopying] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getPublicDecks();
        setDecks(data);
      } catch {
        // `translate` (not `t`) keeps this effect free of an i18n dependency,
        // which would otherwise re-fetch the list on every language change.
        toast.error(translate('flashcard:public.loadFailed', 'Không tải được danh sách công khai'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = decks.filter((d) =>
    d.name.toLowerCase().includes(q.toLowerCase()),
  );

  const handleCopy = async (deck: PublicDeckResponse) => {
    try {
      setCopying(deck.id);
      await copyPublicDeck(deck.id);
      toast.success(t('public.copied', { name: deck.name }));
      onChange();
    } catch {
      toast.error(t('public.copyFailed'));
    } finally {
      setCopying(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('public.searchPlaceholder')}
          className="flex-1"
          data-testid="public-deck-search"
        />
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {t('public.empty')}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((d) => (
            <div
              key={d.id}
              className="rounded-xl border bg-card p-4 flex items-center justify-between gap-3"
              data-testid={`public-deck-${d.id}`}
            >
              <div className="min-w-0">
                <p className="font-bold truncate flex items-center gap-1.5">
                  <Globe2 className="w-3 h-3 text-blue-500 shrink-0" />
                  {d.name}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase">
                  {t('public.cardCount', { count: d.card_count })}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handleCopy(d)}
                disabled={copying === d.id}
                data-testid={`copy-public-deck-${d.id}`}
              >
                {copying === d.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <CopyIcon className="w-3 h-3 mr-1" /> {t('public.copy')}
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PublicDecksPanel;
