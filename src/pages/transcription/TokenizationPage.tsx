import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TokenizeSentencePanel } from '@/components/dictionary/TokenizedSentence';
import {
  deleteTokenizationHistory,
  getTokenizationHistory,
  saveTokenization,
  type TokenizationHistoryItem,
} from '@/lib/api/dictionary';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { History, Loader2, RefreshCw, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

const SAMPLES = [
  '今日はいい天気ですね。',
  '日本語を勉強しています。',
  '彼は東京に住んでいます。',
];

export default function TokenizationPage() {
  const { t } = useTranslation('transcription');
  const { t: td } = useTranslation('dictionary');
  const { user } = useAuth();
  const [seed, setSeed] = useState('');
  const [history, setHistory] = useState<TokenizationHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const skipNextSave = useRef(false);

  const loadHistory = useCallback(async () => {
    if (!user?.id) return;
    try {
      setHistoryLoading(true);
      const result = await getTokenizationHistory();
      setHistory(result.items);
    } catch {
      toast.error(td('tokenize.historyLoadFailed'));
    } finally {
      setHistoryLoading(false);
    }
  }, [td, user?.id]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const handleAnalyzed = async (text: string) => {
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    try {
      await saveTokenization(text);
      await loadHistory();
    } catch {
      toast.error(td('tokenize.historySaveFailed'));
    }
  };

  const handleDelete = async (item: TokenizationHistoryItem) => {
    try {
      setDeleting(item.history_id);
      await deleteTokenizationHistory(item.history_id);
      setHistory((items) => items.filter((historyItem) => historyItem.history_id !== item.history_id));
    } catch {
      toast.error(td('tokenize.historyDeleteFailed'));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto animate-fade-in" data-testid="tokenization-page">
      <header className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-2xl md:text-3xl text-foreground flex items-center gap-2">
            <Wand2 className="w-6 h-6 text-primary" /> {t('tokenize.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t('tokenize.desc')}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {SAMPLES.map((s, i) => (
            <Button key={i} variant="outline" size="sm" className="text-xs gap-1.5 font-japanese" onClick={() => setSeed(s)} data-testid={`sample-sentence-${i}`}>
              <Sparkles className="w-3 h-3 text-primary" />
              {s}
            </Button>
          ))}
        </div>
      </header>

      <TokenizeSentencePanel
        key={seed}
        initialText={seed}
        onAnalyzed={(text) => void handleAnalyzed(text)}
      />

      {user && (
        <section className="mt-8 space-y-3" aria-labelledby="tokenization-history-title">
          <div className="flex items-center justify-between gap-2">
            <h2 id="tokenization-history-title" className="font-display font-semibold text-lg flex items-center gap-2">
              <History className="w-4 h-4 text-primary" /> {td('tokenize.historyTitle')}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => void loadHistory()} disabled={historyLoading} aria-label={td('tokenize.refreshHistory')}>
              <RefreshCw className={`w-4 h-4 ${historyLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          {historyLoading && history.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />{td('tokenize.loadingHistory')}</div>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4">{td('tokenize.emptyHistory')}</p>
          ) : (
            <div className="space-y-2">
              {history.map((item) => (
                <div key={item.history_id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                  <button type="button" className="min-w-0 flex-1 text-left font-japanese text-sm hover:text-primary" onClick={() => { skipNextSave.current = true; setSeed(item.text); }}>
                    <span className="block truncate">{item.text}</span>
                    <span className="block text-xs text-muted-foreground mt-1">{new Date(item.date_created).toLocaleString()} · {td('tokenize.sentenceCount', { count: item.sentence_count })}</span>
                  </button>
                  <Button variant="ghost" size="icon" onClick={() => void handleDelete(item)} disabled={deleting === item.history_id} aria-label={td('tokenize.deleteHistory')}>
                    {deleting === item.history_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
