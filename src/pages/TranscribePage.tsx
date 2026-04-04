import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Plus } from 'lucide-react';
import { transcribeVideo, getMyTranscriptions } from '@/lib/api/transcription';
import { canSpendCredits, spendCredits } from '@/lib/api/payment';
import { UsageBadge } from '@/components/transcription/UsageBadge';
import { TranscriptionListItem } from '@/components/transcription/TranscriptionListItem';
import type { TranscriptionResponse } from '@/lib/api/types';

export default function TranscribePage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transcriptions, setTranscriptions] = useState<TranscriptionResponse[]>([]);
  const [listLoading, setListLoading] = useState(true);

  useEffect(() => {
    getMyTranscriptions().then(t => { setTranscriptions(t); setListLoading(false); });
  }, []);

  const handleTranscribe = async () => {
    if (!url.trim()) return;
    setError('');
    setLoading(true);
    try {
      const allowed = await canSpendCredits(1);
      if (!allowed) {
        setError('Không đủ credit. Hãy mua thêm credit để tiếp tục.');
        setLoading(false);
        return;
      }
      const data = await transcribeVideo(url);
      await spendCredits(1);
      setTranscriptions(prev => [data, ...prev]);
      setUrl('');
    } catch {
      setError('Không thể phiên dịch video. Vui lòng kiểm tra lại URL.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h2 className="font-display font-bold text-2xl text-foreground mb-1">Phiên dịch Video</h2>
        <p className="text-sm text-muted-foreground">Dán URL YouTube hoặc tải lên video để tạo bản phiên dịch tiếng Nhật.</p>
      </div>

      <UsageBadge />

      <div className="flex gap-2 mt-4">
        <Input
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          className="flex-1 bg-card border-border font-mono text-sm"
          onKeyDown={e => e.key === 'Enter' && handleTranscribe()}
        />
        <Button onClick={handleTranscribe} disabled={loading || !url.trim()} className="gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Phiên dịch
        </Button>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-6">
        <h3 className="font-display font-semibold text-foreground mb-3">Các bản phiên dịch của tôi</h3>
        {listLoading ? (
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        ) : transcriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Chưa có bản phiên dịch nào.</p>
        ) : (
          <div className="space-y-2">
            {transcriptions.map(t => (
              <TranscriptionListItem key={t.id} transcription={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
