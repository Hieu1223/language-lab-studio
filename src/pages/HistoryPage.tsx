import { useEffect, useState } from 'react';
import { getHistory } from '@/lib/api/common';
import type { HistoryEntry } from '@/lib/api/common';
import { Clock } from 'lucide-react';

const USER_ID = 'current-user';

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { getHistory(USER_ID, filter).then(h => { setHistory(h); setLoading(false); }); }, [filter]);

  const tabs = [
    { key: 'all', label: 'Tất cả' },
    { key: 'transcription', label: 'Phiên dịch' },
    { key: 'flashcard', label: 'Từ vựng' },
    { key: 'grammar', label: 'Ngữ pháp' },
    { key: 'manga', label: 'Manga' },
  ];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h2 className="font-display font-bold text-2xl text-foreground mb-1">Lịch sử</h2>
        <p className="text-sm text-muted-foreground">Lịch sử sử dụng toàn bộ.</p>
      </div>
      <div className="flex gap-1.5 mb-4 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)} className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${filter === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Đang tải...</p> : (
        <div className="space-y-2">
          {history.map(h => (
            <div key={h.id} className="bg-card border border-border rounded-lg p-3">
              <p className="text-sm font-medium text-foreground">{h.title}</p>
              <p className="text-xs text-muted-foreground">{h.description}</p>
              <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 mt-1"><Clock className="w-3 h-3" />{new Date(h.timestamp).toLocaleString('vi-VN')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
