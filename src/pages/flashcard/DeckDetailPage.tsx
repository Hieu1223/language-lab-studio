import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Save,
  Trash2,
  RefreshCcw,
  Plus,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  deleteCard,
  getCardsInDeck,
  getDeckProgress,
  getDecks,
  parseCardData,
  resetCard,
  updateDeck,
  type CardResponse,
  type CardState,
  type DeckProgressResponse,
  type DeckWithStatsResponse,
  type VocabCardData,
} from '@/lib/api/flashcard';
import { translate } from '@/lib/i18n-runtime';
import { getDateLocale } from '@/i18n';

const STATE_COLORS: Record<CardState, string> = {
  new: 'bg-blue-500/10 text-blue-600',
  learning: 'bg-amber-500/10 text-amber-600',
  review: 'bg-green-500/10 text-green-600',
  relearning: 'bg-red-500/10 text-red-600',
};

/** Card `data` is a JSON string whose shape depends on `card_type`. */
function cardContent(card: CardResponse): VocabCardData {
  return parseCardData<VocabCardData>(card.data) ?? { word: '' };
}

export default function DeckDetailPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('flashcard');
  const { t: tc } = useTranslation('common');
  const [deck, setDeck] = useState<DeckWithStatsResponse | null>(null);
  const [cards, setCards] = useState<CardResponse[]>([]);
  const [progress, setProgress] = useState<DeckProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<CardResponse | null>(null);

  const load = async () => {
    if (!deckId) return;
    try {
      setLoading(true);
      const [decks, c, p] = await Promise.all([
        getDecks(),
        getCardsInDeck(deckId),
        getDeckProgress(deckId).catch(() => null),
      ]);
      const d = decks.find((x) => x.id === deckId) ?? null;
      setDeck(d);
      setName(d?.name ?? '');
      setCards(c);
      setProgress(p);
    } catch {
      // `translate` (not `t`) keeps `load` out of the effect's dependency set,
      // which would otherwise re-fetch the deck on every language change.
      toast.error(translate('flashcard:detail.loadFailed', 'Không tải được bộ'));
      navigate('/flashcard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  const handleSaveName = async () => {
    if (!deckId) return;
    if (!name.trim() || name === deck?.name) {
      setEditingName(false);
      return;
    }
    try {
      setSavingName(true);
      await updateDeck(deckId, name.trim());
      toast.success(t('detail.renamed'));
      setEditingName(false);
      load();
    } catch {
      toast.error(t('detail.renameFailed'));
    } finally {
      setSavingName(false);
    }
  };

  const handleDeleteCard = async () => {
    if (!confirmDelete || !deckId) return;
    try {
      await deleteCard(deckId, confirmDelete.id);
      toast.success(t('detail.cardDeleted'));
      setCards((prev) => prev.filter((c) => c.id !== confirmDelete.id));
    } catch {
      toast.error(t('detail.cardDeleteFailed'));
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleResetCard = async (card: CardResponse) => {
    if (!deckId) return;
    try {
      await resetCard(deckId, card.id);
      toast.success(t('detail.srsReset'));
      load();
    } catch {
      toast.error(t('detail.resetFailed'));
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((c) => {
      const content = cardContent(c);
      return (
        (content.word ?? '').toLowerCase().includes(q) ||
        (content.reading ?? '').toLowerCase().includes(q) ||
        (content.meaning ?? '').toLowerCase().includes(q)
      );
    });
  }, [cards, search]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!deck) return null;

  return (
    <div
      className="p-4 md:p-6 max-w-5xl mx-auto animate-fade-in"
      data-testid="deck-detail-page"
    >
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 gap-2"
        onClick={() => navigate('/flashcard')}
      >
        <ArrowLeft className="w-4 h-4" /> {t('detail.backToList')}
      </Button>

      <header className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="flex gap-2 items-center max-w-md">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-2xl font-bold"
                autoFocus
                data-testid="deck-name-input"
              />
              <Button
                size="icon"
                onClick={handleSaveName}
                disabled={savingName}
                data-testid="deck-name-save-btn"
              >
                {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              </Button>
            </div>
          ) : (
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              {deck.name}
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setEditingName(true)}
                data-testid="deck-edit-name-btn"
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </h1>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            {t('public.cardCount', { count: cards.length })} ·{' '}
            {deck.public ? t('detail.public') : t('detail.private')}
          </p>
        </div>

        <Button
          onClick={() => navigate(`/flashcard/review/${deck.id}`)}
          disabled={cards.length === 0}
          className="gap-2"
          data-testid="start-review-btn"
        >
          <Sparkles className="w-4 h-4" /> {t('detail.review')}
        </Button>
      </header>

      {progress && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          {[
            [t('detail.total'), progress.total, 'bg-muted/50'],
            [t('detail.due'), progress.due, 'bg-amber-500/10 text-amber-600'],
            [t('detail.new'), progress.new, 'bg-blue-500/10 text-blue-600'],
            [t('detail.learning'), progress.learning, 'bg-amber-500/10 text-amber-600'],
          ].map(([label, val, color]) => (
            <div
              key={label as string}
              className={`rounded-lg p-2 text-center ${color}`}
            >
              <p className="text-[9px] uppercase font-bold">{label}</p>
              <p className="text-lg font-bold">{val as number}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('detail.searchPlaceholder')}
          className="max-w-sm"
          data-testid="card-search-input"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center flex flex-col items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {cards.length === 0 ? t('detail.empty') : t('detail.noMatch')}
          </p>
          {cards.length === 0 && (
            <Button size="sm" onClick={() => navigate('/dictionary')} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> {t('detail.addFromDictionary')}
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border bg-card divide-y">
          {filtered.map((c) => {
            const content = cardContent(c);
            return (
            <div
              key={c.id}
              className="p-3 flex items-center justify-between gap-3 hover:bg-muted/30"
              data-testid={`card-row-${c.id}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className="font-bold font-japanese">{content.word}</p>
                  <p className="text-xs text-muted-foreground font-japanese">
                    {content.reading}
                  </p>
                  <span
                    className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded ${STATE_COLORS[c.state]}`}
                  >
                    {c.state}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {content.meaning}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {t('detail.dueAt')}
                  {c.due
                    ? new Date(c.due).toLocaleDateString(getDateLocale())
                    : t('detail.notScheduled')}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => handleResetCard(c)}
                  title={t('detail.resetSrs')}
                  data-testid={`card-reset-${c.id}`}
                >
                  <RefreshCcw className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-red-500 hover:text-red-600"
                  onClick={() => setConfirmDelete(c)}
                  title={t('detail.delete')}
                  data-testid={`card-delete-${c.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('detail.confirmDeleteCard')}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete
                ? `${cardContent(confirmDelete).word} — ${cardContent(confirmDelete).meaning ?? ''}`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCard}
              className="bg-red-500 hover:bg-red-600"
            >
              {tc('actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
