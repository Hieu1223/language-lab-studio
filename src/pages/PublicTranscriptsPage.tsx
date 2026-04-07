import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { getPublicTranscripts } from '@/lib/api/transcription';
import type { PublicTranscript } from '@/lib/api/transcription';
import { PublicTranscriptCard } from '@/components/public/PublicTranscriptCard';
import { Search } from 'lucide-react';

export default function PublicTranscriptsPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicTranscript[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      getPublicTranscripts(query).then(r => { setResults(r); setLoading(false); });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h2 className="font-display font-bold text-2xl text-foreground mb-1">Transcript công khai</h2>
        <p className="text-sm text-muted-foreground">Tìm kiếm và xem transcript được chia sẻ bởi cộng đồng.</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Tìm kiếm transcript..."
          className="pl-9 bg-card border-border"
        />
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Đang tải...</div>
      ) : results.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Không tìm thấy transcript.</div>
      ) : (
        <div className="space-y-3">
          {results.map(t => <PublicTranscriptCard key={t.id} transcript={t} />)}
        </div>
      )}
    </div>
  );
}
