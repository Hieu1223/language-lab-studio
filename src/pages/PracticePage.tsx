import { useEffect, useState } from 'react';
import { getDueSentences, checkAnswer, reviewSentence, getClozeFillItems, getSentenceFillItems, getDefaultPracticeTypeConfig } from '@/lib/api/practice';
import { canSpendCredits, spendCredits } from '@/lib/api/common';
import type { SentencePractice, PracticeResult, PracticeMode, PracticeType, PracticeTypeConfig, ClozeFillItem, SentenceFillItem } from '@/lib/api/practice';
import type { SRSRating } from '@/lib/api/common';
import { UsageBadge } from '@/components/transcription/UsageBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, ArrowRightLeft, Settings } from 'lucide-react';

export default function PracticePage() {
  const [sentences, setSentences] = useState<SentencePractice[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState('');
  const [checking, setChecking] = useState(false);
  const [creditError, setCreditError] = useState('');
  const [mode, setMode] = useState<PracticeMode>('jp-to-vn');
  const [practiceTypes, setPracticeTypes] = useState<PracticeTypeConfig[]>(getDefaultPracticeTypeConfig());
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => { getDueSentences().then(s => { setSentences(s); setLoading(false); }); }, []);

  const sentence = sentences[currentIdx];

  const handleSubmit = async () => {
    if (!sentence || !answer.trim()) return;
    const allowed = await canSpendCredits(sentence.creditCost);
    if (!allowed) { setCreditError(`Không đủ credit (cần ${sentence.creditCost}).`); return; }
    setCreditError(''); setChecking(true);
    await spendCredits(sentence.creditCost);
    const res = await checkAnswer(sentence.id, answer, mode);
    setResult(res); setChecking(false);
  };

  const handleNext = async (rating: SRSRating) => {
    await reviewSentence(sentence.id, rating);
    setResult(null); setAnswer('');
    if (currentIdx + 1 < sentences.length) setCurrentIdx(currentIdx + 1);
    else { const fresh = await getDueSentences(); setSentences(fresh); setCurrentIdx(0); }
  };

  if (loading) return <div className="p-6 text-muted-foreground text-sm">Đang tải...</div>;

  const prompt = sentence ? (mode === 'jp-to-vn' ? sentence.japanese : sentence.vietnamese) : '';

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto animate-fade-in">
      <div className="mb-4">
        <h2 className="font-display font-bold text-2xl text-foreground mb-1">Luyện câu</h2>
        <p className="text-sm text-muted-foreground">Dịch câu và AI kiểm tra ngữ pháp.</p>
      </div>
      <div className="flex items-center justify-between mb-4">
        <UsageBadge />
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setMode(mode === 'jp-to-vn' ? 'vn-to-jp' : 'jp-to-vn')} className="gap-1 text-xs">
            <ArrowRightLeft className="w-3 h-3" /> {mode === 'jp-to-vn' ? 'Nhật→Việt' : 'Việt→Nhật'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)} className="w-8 h-8 p-0">
            <Settings className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {showSettings && (
        <div className="bg-card border border-border rounded-2xl p-4 mb-4 space-y-2">
          <p className="text-xs font-bold text-foreground">Loại luyện tập</p>
          {practiceTypes.map((pt, i) => (
            <label key={pt.type} className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={pt.enabled} onChange={e => setPracticeTypes(prev => prev.map((p, j) => j === i ? { ...p, enabled: e.target.checked } : p))} className="rounded" />
              <span className="font-bold text-foreground">{pt.label}</span> — {pt.description}
            </label>
          ))}
        </div>
      )}

      {creditError && (
        <div className="mb-4 flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{creditError}
        </div>
      )}

      {sentences.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground"><p className="text-lg mb-2">🎉 Đã ôn hết!</p></div>
      ) : !result ? (
        <div>
          <div className="text-xs font-mono text-muted-foreground mb-3">{currentIdx + 1}/{sentences.length} · {sentence.difficulty} · {sentence.creditCost} credit</div>
          <div className="bg-card border border-border rounded-lg p-5 mb-4">
            <p className="text-xs text-muted-foreground mb-1">{mode === 'jp-to-vn' ? 'Tiếng Nhật:' : 'Tiếng Việt:'}</p>
            <p className="text-lg text-foreground font-medium">{prompt}</p>
          </div>
          <Textarea value={answer} onChange={e => setAnswer(e.target.value)} placeholder={mode === 'jp-to-vn' ? 'Nhập bản dịch tiếng Việt...' : 'Nhập bản dịch tiếng Nhật...'} className="bg-card border-border mb-3 min-h-[80px]" />
          <Button onClick={handleSubmit} disabled={checking || !answer.trim()} className="w-full">{checking ? 'Đang kiểm tra...' : 'Kiểm tra'}</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className={`p-4 rounded-lg border ${result.isCorrect ? 'bg-success/10 border-success/30 text-success' : 'bg-destructive/10 border-destructive/30 text-destructive'}`}>
            <p className="font-medium text-sm">{result.feedback}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 space-y-2">
            <div><p className="text-xs text-muted-foreground">Bạn:</p><p className="text-sm">{result.userAnswer}</p></div>
            <div><p className="text-xs text-muted-foreground">Đáp án:</p><p className="text-sm font-medium">{result.correctAnswer}</p></div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(['again', 'hard', 'good', 'easy'] as SRSRating[]).map(r => (
              <Button key={r} variant={r === 'again' ? 'destructive' : r === 'easy' ? 'default' : 'outline'} size="sm" onClick={() => handleNext(r)} className="text-xs capitalize">
                {r === 'again' ? 'Lại' : r === 'hard' ? 'Khó' : r === 'good' ? 'Tốt' : 'Dễ'}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
