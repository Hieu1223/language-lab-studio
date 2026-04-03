import { useEffect, useState } from 'react';
import { getHistory } from '@/lib/api/transcription';
import { getMyTranscripts } from '@/lib/api/transcription';
import type { HistoryEntry, TranscriptionResponse } from '@/lib/api/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, FileText } from 'lucide-react';

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [myTranscripts, setMyTranscripts] = useState<TranscriptionResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getHistory(), getMyTranscripts()]).then(([h, t]) => {
      setHistory(h);
      setMyTranscripts(t);
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h2 className="font-display font-bold text-2xl text-foreground mb-1">History</h2>
        <p className="text-sm text-muted-foreground">Your transcript history and saved transcriptions.</p>
      </div>

      <Tabs defaultValue="history">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="history" className="gap-1.5 text-xs"><Clock className="w-3.5 h-3.5" /> Recent</TabsTrigger>
          <TabsTrigger value="mine" className="gap-1.5 text-xs"><FileText className="w-3.5 h-3.5" /> My Transcripts</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-4">
          {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
            <div className="space-y-2">
              {history.map(h => (
                <div key={h.id} className="bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition-colors cursor-pointer">
                  <p className="text-sm font-medium text-foreground">{h.title}</p>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground font-mono">
                    <span>{new Date(h.createdAt).toLocaleString()}</span>
                    <span className="uppercase">{h.language}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="mine" className="mt-4">
          {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
            <div className="space-y-2">
              {myTranscripts.map(t => (
                <div key={t.id} className="bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{t.title}</p>
                    {t.isPublic && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-success/10 text-success border border-success/20">public</span>}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-1">{new Date(t.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
