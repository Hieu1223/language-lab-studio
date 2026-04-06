import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { tokenizeText } from '@/lib/api/transcription';
import type { TokenizedResult } from '@/lib/api/transcription';
import { TokenDisplay } from '@/components/tokenizer/TokenDisplay';
import { Loader2, Type } from 'lucide-react';

export default function TokenizerPage() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<TokenizedResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTokenize = async () => {
    if (!text.trim()) return;
    setLoading(true);
    const res = await tokenizeText(text.trim());
    setResult(res); setLoading(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h2 className="font-display font-bold text-2xl text-foreground mb-1">Tokenizer</h2>
        <p className="text-sm text-muted-foreground">Phân tích văn bản tiếng Nhật.</p>
      </div>
      <Textarea value={text} onChange={e => setText(e.target.value)} placeholder="Dán văn bản tiếng Nhật..." className="bg-card border-border mb-3 min-h-[120px]" />
      <Button onClick={handleTokenize} disabled={loading || !text.trim()} className="gap-2">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Type className="w-4 h-4" />} Phân tích
      </Button>
      {result && <div className="mt-6"><TokenDisplay result={result} /></div>}
    </div>
  );
}
