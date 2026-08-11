import { Globe2, Library, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

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
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  createDeck,
  deleteDeck,
  type DeckWithStatsResponse,
} from '@/lib/api/flashcard';

export interface DecksPanelProps {
  decks: DeckWithStatsResponse[];
  onChange: () => void;
}

export function DecksPanel({ decks, onChange }: DecksPanelProps) {
  const navigate = useNavigate();
  const { t } = useTranslation('flashcard');
  const { t: tc } = useTranslation('common');
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<DeckWithStatsResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error(t('decks.nameRequired'));
      return;
    }
    try {
      setCreating(true);
      await createDeck(name.trim(), isPublic);
      toast.success(t('decks.created'));
      setName('');
      setIsPublic(false);
      setCreateOpen(false);
      onChange();
    } catch {
      toast.error(t('decks.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      setDeleting(true);
      await deleteDeck(confirmDelete.id);
      toast.success(t('decks.deleted'));
      setConfirmDelete(null);
      onChange();
    } catch {
      toast.error(t('decks.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{t('decks.count', { count: decks.length })}</p>
        <Button size="sm" onClick={() => setCreateOpen(true)} data-testid="create-deck-btn">
          <Plus className="w-3.5 h-3.5 mr-1" /> {t('decks.create')}
        </Button>
      </div>

      {decks.length === 0 ? (
        <div className="py-16 text-center flex flex-col items-center gap-3">
          <Library className="w-10 h-10 opacity-40" />
          <p className="text-sm text-muted-foreground">{t('decks.empty')}</p>
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="w-3.5 h-3.5 mr-1" /> {t('decks.createFirst')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {decks.map((d) => {
            const total = d.stats.new + d.stats.learning + d.stats.due;
            return (
              <div
                key={d.id}
                className="rounded-xl border bg-card p-4 hover:border-primary/40 transition-colors"
                data-testid={`deck-${d.id}`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="font-bold truncate flex items-center gap-1.5">
                      {d.name}
                      {d.public && (
                        <Globe2 className="w-3 h-3 text-blue-500" />
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase">
                      {t('decks.cardSummary', { total, due: d.stats.due })}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => navigate(`/flashcard/decks/${d.id}`)}
                      title={t('decks.edit')}
                      data-testid={`deck-edit-${d.id}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-red-500 hover:text-red-600"
                      onClick={() => setConfirmDelete(d)}
                      title={t('decks.delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1 mb-3">
                  {[
                    { label: t('stats.new'), val: d.stats.new, color: 'bg-blue-500/10 text-blue-600' },
                    { label: t('stats.learning'), val: d.stats.learning, color: 'bg-amber-500/10 text-amber-600' },
                    { label: t('stats.review'), val: d.stats.due, color: 'bg-green-500/10 text-green-600' },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className={`rounded-md p-1.5 text-center ${s.color}`}
                    >
                      <p className="text-[9px] uppercase font-bold">{s.label}</p>
                      <p className="text-base font-bold">{s.val}</p>
                    </div>
                  ))}
                </div>

                <Button
                  size="sm"
                  className="w-full"
                  disabled={d.stats.due === 0 && total === 0}
                  onClick={() => navigate(`/flashcard/review/${d.id}`)}
                  data-testid={`deck-review-${d.id}`}
                >
                  {t('decks.review')}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('decks.createTitle')}</DialogTitle>
            <DialogDescription>{t('decks.createDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="deck-name">{t('decks.nameLabel')}</Label>
              <Input
                id="deck-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('decks.namePlaceholder')}
                data-testid="new-deck-name"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="deck-public">{t('decks.public')}</Label>
              <Switch id="deck-public" checked={isPublic} onCheckedChange={setIsPublic} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              {tc('actions.cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={creating} data-testid="confirm-create-deck">
              {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : tc('actions.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('decks.confirmDeleteTitle', { name: confirmDelete?.name ?? '' })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('decks.confirmDeleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : tc('actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default DecksPanel;
