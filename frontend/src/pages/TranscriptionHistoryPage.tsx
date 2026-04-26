import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Loader2,
  History,
  Trash2,
  ExternalLink,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  deleteTranscriptionHistory,
  describeTranscriptStatus,
  getTranscriptionHistory,
  isTranscriptError,
  isTranscriptReady,
  type UserHistoryItem,
} from '@/lib/api/transcription-real';

function StatusBadge({ status }: { status: number }) {
  if (isTranscriptReady(status)) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-green-500/10 text-green-600">
        <CheckCircle2 className="w-3 h-3" />
        {describeTranscriptStatus(status)}
      </span>
    );
  }
  if (isTranscriptError(status)) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-500/10 text-red-600">
        <AlertTriangle className="w-3 h-3" />
        Lỗi
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600">
      <Clock className="w-3 h-3" />
      {describeTranscriptStatus(status)}
    </span>
  );
}

export default function TranscriptionHistoryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<UserHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<UserHistoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getTranscriptionHistory();
      // newest first
      setItems(
        [...data].sort(
          (a, b) =>
            new Date(b.date_created).getTime() - new Date(a.date_created).getTime(),
        ),
      );
    } catch {
      toast.error('Không tải được lịch sử');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      setDeleting(true);
      await deleteTranscriptionHistory(confirmDelete.history_id);
      setItems((prev) =>
        prev.filter((i) => i.history_id !== confirmDelete.history_id),
      );
      toast.success('Đã xoá khỏi lịch sử');
    } catch {
      toast.error('Xoá thất bại');
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  const handleOpen = (item: UserHistoryItem) => {
    if (isTranscriptError(item.status)) {
      toast.error('Bản phiên dịch này đã lỗi.');
      return;
    }
    navigate(`/transcript/${item.transcript_id}`);
  };

  return (
    <div className="animate-fade-in" data-testid="transcription-history-page">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
        <Button variant="outline" size="sm" onClick={load} data-testid="reload-history-btn" className="ml-auto">
          Làm mới
        </Button>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 text-center">
          <History className="w-10 h-10 opacity-40" />
          <p className="text-sm text-muted-foreground">Chưa có bản phiên dịch nào.</p>
          <Button onClick={() => navigate('/youtube')} size="sm">
            Tìm video YouTube
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <div
              key={it.history_id}
              className="flex flex-col sm:flex-row gap-3 rounded-xl border bg-card hover:border-primary/40 p-3 transition-colors group"
              data-testid={`history-item-${it.history_id}`}
            >
              <div
                className="w-full sm:w-44 aspect-video rounded-md overflow-hidden bg-muted shrink-0 cursor-pointer relative"
                onClick={() => handleOpen(it)}
              >
                {it.thumbnail_url ? (
                  <img
                    src={it.thumbnail_url}
                    alt=""
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
                    <Play className="w-8 h-8" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <StatusBadge status={it.status} />
                  <span className="text-[10px] uppercase font-mono text-muted-foreground">
                    {it.original_source}
                  </span>
                </div>
                <p
                  className="text-sm font-bold leading-tight line-clamp-2 cursor-pointer hover:text-primary transition-colors"
                  onClick={() => handleOpen(it)}
                >
                  {it.name}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {new Date(it.date_created).toLocaleString('vi-VN')}
                </p>

                <div className="flex gap-1.5 mt-auto pt-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 text-xs gap-1.5"
                    onClick={() => handleOpen(it)}
                    disabled={isTranscriptError(it.status)}
                    data-testid={`open-history-${it.history_id}`}
                  >
                    {isTranscriptReady(it.status) ? (
                      <>
                        <ExternalLink className="w-3 h-3" /> Mở
                      </>
                    ) : isTranscriptError(it.status) ? (
                      'Không thể mở'
                    ) : (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" /> Đang xử lý
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1.5 text-red-500 hover:text-red-600"
                    onClick={() => setConfirmDelete(it)}
                    data-testid={`delete-history-${it.history_id}`}
                  >
                    <Trash2 className="w-3 h-3" /> Xoá
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá khỏi lịch sử?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Huỷ</AlertDialogCancel>
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
