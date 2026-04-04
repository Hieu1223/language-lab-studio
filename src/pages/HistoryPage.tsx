import { useEffect, useState } from 'react';
import { getHistory } from '@/lib/api/transcription';
import type { HistoryEntry } from '@/lib/api/types';
import { Clock } from 'lucide-react';

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHistory().then(h => { setHistory(h); setLoading(false); });
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h2 className="font-display font-bold text-2xl text-foreground mb-1">Lịch sử</h2>
        <p className="text-sm text-muted-foreground">Lịch sử phiên dịch gần đây.</p>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Đang tải...</p> : (
        <div className="space-y-2">
          {history.map(h => (
            <div key={h.id} className="bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition-colors cursor-pointer">
              <p className="text-sm font-medium text-foreground">{h.title}</p>
              <div className="flex gap-3 mt-1 text-xs text-muted-foreground font-mono">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(h.createdAt).toLocaleString()}</span>
                <span className="uppercase">{h.language}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
