import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Loader2,
  Plus,
  Library,
  Globe2,
  TrendingUp,
  Sparkles,
  ListPlus,
  Pencil,
  Trash2,
  Search,
  Copy as CopyIcon,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  copyPublicDeck,
  createDeck,
  deleteDeck,
  getDailyStats,
  getDecks,
  getOverviewStats,
  getPublicDecks,
  searchWords,
  type DailyStat,
  type DeckWithStats,
  type OverviewStats,
  type PublicDeck,
  type WordResponse,
} from '@/lib/api/flashcard-real';
import { AddToDeckDialog } from '@/components/dictionary/AddToDeckDialog';
import { TokenizeSentencePanel } from '@/components/dictionary/TokenizedSentence';

// ─── Overview & Charts ─────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className={`w-3.5 h-3.5 ${color}`} />
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function OverviewPanel({
  overview,
  daily,
  decks,
}: {
  overview: OverviewStats | null;
  daily: DailyStat[];
  decks: DeckWithStats[];
}) {
  const totalDeckStats = useMemo(
    () =>
      decks.reduce(
        (acc, d) => ({
          new: acc.new + d.stats.new,
          learning: acc.learning + d.stats.learning,
          review: acc.review + d.stats.review,
          relearning: acc.relearning + d.stats.relearning,
        }),
        { new: 0, learning: 0, review: 0, relearning: 0 },
      ),
    [decks],
  );

  const pieData = [
    { name: 'New', value: totalDeckStats.new, fill: '#3b82f6' },
    { name: 'Learning', value: totalDeckStats.learning, fill: '#f59e0b' },
    { name: 'Review', value: totalDeckStats.review, fill: '#10b981' },
    { name: 'Relearning', value: totalDeckStats.relearning, fill: '#ef4444' },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6" data-testid="flashcard-overview">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Tổng số bộ"
          value={overview?.total_decks ?? '—'}
          icon={Library}
          color="text-blue-500"
        />
        <StatCard
          label="Tổng số thẻ"
          value={overview?.total_cards ?? '—'}
          icon={ListPlus}
          color="text-purple-500"
        />
        <StatCard
          label="Đến hạn"
          value={overview?.due_cards ?? '—'}
          icon={Sparkles}
          color="text-amber-500"
        />
        <StatCard
          label="Streak"
          value={overview?.streak_days != null ? `${overview.streak_days} ngày` : '—'}
          icon={TrendingUp}
          color="text-green-500"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard
          label="Hôm nay"
          value={overview?.reviews_today ?? '—'}
          icon={BarChart3}
          color="text-rose-500"
        />
        <StatCard
          label="Mới"
          value={overview?.new_cards ?? '—'}
          icon={Sparkles}
          color="text-blue-400"
        />
        <StatCard
          label="Độ chính xác"
          value={
            overview?.accuracy != null
              ? `${(overview.accuracy * 100).toFixed(1)}%`
              : '—'
          }
          icon={TrendingUp}
          color="text-emerald-500"
        />
      </div>

      {/* Daily reviews */}
      {daily.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold">Ôn tập hằng ngày</p>
            <p className="text-xs text-muted-foreground">{daily.length} ngày gần nhất</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 11,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="correct" stackId="a" fill="#10b981" name="Đúng" />
              <Bar dataKey="wrong" stackId="a" fill="#ef4444" name="Sai" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Accuracy line + state pie */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {daily.length > 0 && (
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm font-bold mb-3">Độ chính xác theo ngày</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  domain={[0, 1]}
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                />
                <Tooltip
                  formatter={(v: number) => `${(v * 100).toFixed(1)}%`}
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {pieData.length > 0 && (
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm font-bold mb-3">Phân bố trạng thái thẻ</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={(d) => `${d.name}: ${d.value}`}
                  labelLine={false}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── My decks panel ───────────────────────────────────────────────────────

function DecksPanel({
  decks,
  onChange,
}: {
  decks: DeckWithStats[];
  onChange: () => void;
}) {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<DeckWithStats | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Tên không được trống');
      return;
    }
    try {
      setCreating(true);
      await createDeck(name.trim(), isPublic);
      toast.success('Đã tạo bộ');
      setName('');
      setIsPublic(false);
      setCreateOpen(false);
      onChange();
    } catch {
      toast.error('Không thể tạo bộ');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      setDeleting(true);
      await deleteDeck(confirmDelete.id);
      toast.success('Đã xoá');
      setConfirmDelete(null);
      onChange();
    } catch {
      toast.error('Xoá thất bại');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{decks.length} bộ</p>
        <Button size="sm" onClick={() => setCreateOpen(true)} data-testid="create-deck-btn">
          <Plus className="w-3.5 h-3.5 mr-1" /> Tạo bộ
        </Button>
      </div>

      {decks.length === 0 ? (
        <div className="py-16 text-center flex flex-col items-center gap-3">
          <Library className="w-10 h-10 opacity-40" />
          <p className="text-sm text-muted-foreground">Chưa có bộ flashcard nào</p>
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="w-3.5 h-3.5 mr-1" /> Tạo bộ đầu tiên
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {decks.map((d) => {
            const total = d.stats.new + d.stats.learning + d.stats.review + d.stats.relearning;
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
                      {total} thẻ · {d.stats.due} đến hạn
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => navigate(`/vocabulary/decks/${d.id}`)}
                      title="Sửa"
                      data-testid={`deck-edit-${d.id}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-red-500 hover:text-red-600"
                      onClick={() => setConfirmDelete(d)}
                      title="Xoá"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1 mb-3">
                  {[
                    { label: 'Mới', val: d.stats.new, color: 'bg-blue-500/10 text-blue-600' },
                    { label: 'Đang học', val: d.stats.learning, color: 'bg-amber-500/10 text-amber-600' },
                    { label: 'Ôn', val: d.stats.review, color: 'bg-green-500/10 text-green-600' },
                    { label: 'Học lại', val: d.stats.relearning, color: 'bg-red-500/10 text-red-600' },
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
                  onClick={() => navigate(`/vocabulary/review/${d.id}`)}
                  data-testid={`deck-review-${d.id}`}
                >
                  Ôn tập
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
            <DialogTitle>Tạo bộ mới</DialogTitle>
            <DialogDescription>Nhập tên cho bộ flashcard mới.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="deck-name">Tên bộ</Label>
              <Input
                id="deck-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: N5 Vocabulary"
                data-testid="new-deck-name"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="deck-public">Công khai</Label>
              <Switch id="deck-public" checked={isPublic} onCheckedChange={setIsPublic} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Huỷ
            </Button>
            <Button onClick={handleCreate} disabled={creating} data-testid="confirm-create-deck">
              {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Tạo'}
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
            <AlertDialogTitle>Xoá bộ "{confirmDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Toàn bộ thẻ trong bộ sẽ bị xoá vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Xoá'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Public decks panel ───────────────────────────────────────────────────

function PublicDecksPanel({ onChange }: { onChange: () => void }) {
  const [decks, setDecks] = useState<PublicDeck[]>([]);
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
        toast.error('Không tải được danh sách công khai');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = decks.filter((d) =>
    d.name.toLowerCase().includes(q.toLowerCase()),
  );

  const handleCopy = async (deck: PublicDeck) => {
    try {
      setCopying(deck.id);
      await copyPublicDeck(deck.id);
      toast.success(`Đã sao chép "${deck.name}" vào tài khoản`);
      onChange();
    } catch {
      toast.error('Sao chép thất bại');
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
          placeholder="Tìm theo tên bộ..."
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
          Không tìm thấy bộ công khai.
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
                  {d.card_count} thẻ
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
                    <CopyIcon className="w-3 h-3 mr-1" /> Sao chép
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

// ─── Add words panel (tokenize / dictionary) ──────────────────────────────

function AddWordsPanel() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<WordResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [single, setSingle] = useState<WordResponse | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!q.trim()) return;
    try {
      setLoading(true);
      const data = await searchWords(q.trim(), 30);
      setResults(data);
    } catch {
      toast.error('Tìm kiếm thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tabs defaultValue="dict">
      <TabsList className="mb-4">
        <TabsTrigger value="dict" data-testid="addwords-tab-dict">
          <Search className="w-3.5 h-3.5 mr-1.5" /> Tra từ điển
        </TabsTrigger>
        <TabsTrigger value="sentence" data-testid="addwords-tab-sentence">
          <Wand2 className="w-3.5 h-3.5 mr-1.5" /> Phân tích câu
        </TabsTrigger>
      </TabsList>

      <TabsContent value="dict">
        <div className="space-y-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm từ..."
              className="flex-1"
            />
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </form>
          {results.length > 0 && (
            <>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{results.length} kết quả</span>
                <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
                  Thêm tất cả
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
              />
              <AddToDeckDialog
                open={!!single}
                onOpenChange={(o) => !o && setSingle(null)}
                words={single ? [single] : []}
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

// ─── Page ────────────────────────────────────────────────────────────────

export default function FlashcardsPage() {
  const [decks, setDecks] = useState<DeckWithStats[]>([]);
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [daily, setDaily] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [decksRes, ovRes, dlRes] = await Promise.allSettled([
      getDecks(),
      getOverviewStats(),
      getDailyStats(30),
    ]);
    if (decksRes.status === 'fulfilled') setDecks(decksRes.value);
    if (ovRes.status === 'fulfilled') setOverview(ovRes.value);
    if (dlRes.status === 'fulfilled') setDaily(dlRes.value);
    setLoading(false);
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
      <header className="mb-6">
        <h1 className="font-display font-bold text-2xl md:text-3xl text-foreground flex items-center gap-2">
          <Library className="w-6 h-6 text-primary" /> Từ vựng
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Quản lý bộ flashcard, tra cứu từ và theo dõi tiến độ học tập.
        </p>
      </header>

      <Tabs defaultValue="overview">
        <TabsList className="mb-4 grid grid-cols-2 md:grid-cols-4 w-full md:w-auto">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" /> Tổng quan
          </TabsTrigger>
          <TabsTrigger value="decks" data-testid="tab-decks">
            <Library className="w-3.5 h-3.5 mr-1.5" /> Bộ của tôi
          </TabsTrigger>
          <TabsTrigger value="public" data-testid="tab-public">
            <Globe2 className="w-3.5 h-3.5 mr-1.5" /> Công khai
          </TabsTrigger>
          <TabsTrigger value="add" data-testid="tab-add">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Thêm từ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewPanel overview={overview} daily={daily} decks={decks} />
        </TabsContent>
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
