import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import { transcribeVideo } from '@/lib/api/transcription';
import { canSpendCredits, spendCredits } from '@/lib/api/payment';
import { TranscriptViewer } from '@/components/transcription/TranscriptViewer';
import { UsageBadge } from '@/components/transcription/UsageBadge';
import type { TranscriptionResponse } from '@/lib/api/types';

export default function TranscribePage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TranscriptionResponse | null>(null);

  const handleTranscribe = async () => {
    if (!url.trim()) return;
    setError('');
    setLoading(true);
    try {
      const allowed = await canSpendCredits(1);
      if (!allowed) {
        setError('Not enough credits. Wait for daily refuel or upgrade your plan.');
        setLoading(false);
        return;
      }
      const data = await transcribeVideo(url);
      await spendCredits(1);
      setResult(data);
    } catch {
      setError('Failed to transcribe video. Please check the URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h2 className="font-display font-bold text-2xl text-foreground mb-1">Transcribe Video</h2>
        <p className="text-sm text-muted-foreground">Paste a YouTube URL to generate a Japanese transcript with word-level timestamps.</p>
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
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Transcribe
        </Button>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6">
          <TranscriptViewer transcript={result} />
        </div>
      )}
    </div>
  );
}
