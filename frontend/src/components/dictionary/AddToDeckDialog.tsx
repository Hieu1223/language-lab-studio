import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Check, Plus, BookCopy } from 'lucide-react';
import { toast } from 'sonner';
import {
  addCard,
  createDeck,
  getDecks,
  type DeckWithStats,
} from '@/lib/api/flashcard-real';
import type { WordEntry } from '@/lib/api/tokenization';

interface AddToDeckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Words to save. Each must have a uuid4 `id`. */
  words: WordEntry[];
  /** Optional title shown at top */
  title?: string;
}

/**
 * Reusable dialog that lets the user pick / create a deck and add the
 * given words to it. Words must have uuid4 `id` (NOT integer word_id).
 */
export function AddToDeckDialog({
  open,
  onOpenChange,
  words,
  title,
}: AddToDeckDialogProps) {
  const [decks, setDecks] = useState<DeckWithStats[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(false);
  const [selectedDeckId, setSelectedDeckId] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckPublic, setNewDeckPublic] = useState(false);
  const [adding, setAdding] = useState(false);

  // Load decks when opened
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingDecks(true);
        const list = await getDecks();
        if (cancelled) return;
        setDecks(list);
        setShowCreate(list.length === 0);
        if (list.length && !selectedDeckId) setSelectedDeckId(list[0].id);
      } catch {
        toast.error('Không thể tải danh sách bộ thẻ');
      } finally {
        if (!cancelled) setLoadingDecks(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleCreate = async () => {
    const name = newDeckName.trim();
    if (!name) {
      toast.error('Tên bộ không được trống');
      return;
    }
    try {
      setCreating(true);
      const deck = await createDeck(name, newDeckPublic);
      setDecks((d) => [...d, deck]);
      setSelectedDeckId(deck.id);
      setNewDeckName('');
      setNewDeckPublic(false);
      setShowCreate(false);
      toast.success(`Đã tạo bộ "${deck.name}"`);
    } catch {
      toast.error('Tạo bộ thất bại');
    } finally {
      setCreating(false);
    }
  };

  const handleAdd = async () => {
    if (!selectedDeckId) {
      toast.error('Vui lòng chọn một bộ');
      return;
    }
    if (words.length === 0) {
      toast.error('Không có từ nào để thêm');
      return;
    }
    setAdding(true);
    let success = 0;
    let failed = 0;
    for (const w of words) {
      try {
        await addCard(selectedDeckId, w.id);
        success++;
      } catch {
        failed++;
      }
    }
    setAdding(false);
    if (success > 0) toast.success(`Đã thêm ${success} từ vào bộ`);
    if (failed > 0) toast.warning(`Bỏ qua ${failed} từ (đã có hoặc lỗi)`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="add-to-deck-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookCopy className="w-4 h-4 text-primary" />
            {title || `Thêm ${words.length} từ vào bộ`}
          </DialogTitle>
          <DialogDescription>
            Chọn bộ flashcard hiện có hoặc tạo bộ mới.
          </DialogDescription>
        </DialogHeader>

        {/* Word preview */}
        {words.length > 0 && (
          <div className="rounded-lg border bg-muted/30 p-3 max-h-32 overflow-y-auto">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
              {words.length} từ
            </p>
            <div className="flex flex-wrap gap-1.5">
              {words.slice(0, 30).map((w) => (
                <span
                  key={w.id}
                  className="inline-block px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium"
                >
                  {w.word}
                </span>
              ))}
              {words.length > 30 && (
                <span className="text-xs text-muted-foreground">
                  +{words.length - 30} khác
                </span>
              )}
            </div>
          </div>
        )}

        {loadingDecks ? (
          <div className="py-6 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {decks.length > 0 && !showCreate && (
              <div className="space-y-2 max-h-48 overflow-y-auto" data-testid="deck-list">
                {decks.map((deck) => {
                  const active = selectedDeckId === deck.id;
                  return (
                    <button
                      key={deck.id}
                      onClick={() => setSelectedDeckId(deck.id)}
                      data-testid={`deck-option-${deck.id}`}
                      className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
                        active
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{deck.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {deck.stats.due} due · {deck.stats.new} new ·{' '}
                          {deck.stats.review} review
                        </p>
                      </div>
                      {active && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}

            {!showCreate ? (
              <Button
                variant="outline"
                onClick={() => setShowCreate(true)}
                className="w-full justify-start gap-2"
                data-testid="show-create-deck-btn"
              >
                <Plus className="w-4 h-4" /> Tạo bộ mới
              </Button>
            ) : (
              <div className="space-y-3 rounded-lg border p-3 bg-muted/20">
                <div className="space-y-1.5">
                  <Label htmlFor="new-deck-name" className="text-xs">
                    Tên bộ mới
                  </Label>
                  <Input
                    id="new-deck-name"
                    value={newDeckName}
                    onChange={(e) => setNewDeckName(e.target.value)}
                    placeholder="VD: N5 Vocab"
                    data-testid="new-deck-name-input"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="new-deck-public" className="text-xs">
                    Công khai
                  </Label>
                  <Switch
                    id="new-deck-public"
                    checked={newDeckPublic}
                    onCheckedChange={setNewDeckPublic}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleCreate}
                    disabled={creating}
                    className="flex-1"
                    data-testid="create-deck-confirm-btn"
                  >
                    {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Tạo'}
                  </Button>
                  {decks.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowCreate(false)}
                    >
                      Huỷ
                    </Button>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={adding}
          >
            Đóng
          </Button>
          <Button
            onClick={handleAdd}
            disabled={adding || !selectedDeckId || words.length === 0}
            data-testid="add-to-deck-confirm-btn"
          >
            {adding ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                Đang thêm...
              </>
            ) : (
              <>Thêm {words.length} từ</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
