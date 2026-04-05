import { useState } from 'react';
import { splitIntoSentences, checkTranslation, type TranslationCheckResult } from '@/lib/api/translation-practice';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

export default function TranslationPracticePage() {
  const [inputText, setInputText] = useState('');
  const [sentences, setSentences] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [result, setResult] = useState<TranslationCheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [started, setStarted] = useState(false);

  const handleStart = () => {
    const s = splitIntoSentences(inputText);
    if (s.length === 0) return;
    setSentences(s);
    setCurrentIdx(0);
    setStarted(true);
    setResult(null);
    setUserAnswer('');
  };

  const handleCheck = async () => {
    setChecking(true);
    const r = await checkTranslation(sentences[currentIdx], userAnswer);
    setResult(r);
    setChecking(false);
  };

  const handleNext = () => {
    if (currentIdx + 1 < sentences.length) {
      setCurrentIdx(currentIdx + 1);
      setUserAnswer('');
      setResult(null);
    } else {
      setStarted(false);
      setInputText('');
      setSentences([]);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h2 className="font-display font-bold text-2xl text-foreground mb-1">Luyện dịch</h2>
        <p className="text-sm text-muted-foreground">Nhập đoạn văn tiếng Nhật, dịch từng câu một.</p>
      </div>

      {!started ? (
        <div className="space-y-4">
          <Textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Dán đoạn văn tiếng Nhật vào đây...&#10;&#10;Ví dụ: 今日は天気がいいです。公園に行きましょう。"
            className="min-h-[200px] bg-card border-border rounded-xl"
          />
          <Button onClick={handleStart} disabled={!inputText.trim()} className="w-full rounded-xl font-bold gap-2">
            Bắt đầu luyện dịch <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs font-mono text-muted-foreground mb-2">
            Câu {currentIdx + 1} / {sentences.length}
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <p className="text-2xl font-display font-bold text-foreground">{sentences[currentIdx]}</p>
          </div>

          <Input
            value={userAnswer}
            onChange={e => setUserAnswer(e.target.value)}
            placeholder="Nhập bản dịch tiếng Việt..."
            className="bg-card border-border rounded-xl"
            onKeyDown={e => e.key === 'Enter' && !result && handleCheck()}
          />

          {!result ? (
            <Button onClick={handleCheck} disabled={!userAnswer.trim() || checking} className="w-full rounded-xl font-bold">
              {checking ? 'Đang kiểm tra...' : 'Kiểm tra'}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className={`p-4 rounded-2xl border ${result.isCorrect ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {result.isCorrect ? <CheckCircle2 className="w-5 h-5 text-success" /> : <XCircle className="w-5 h-5 text-destructive" />}
                  <span className="font-bold text-sm">{result.isCorrect ? 'Chính xác!' : 'Chưa chính xác'}</span>
                </div>
                <p className="text-sm text-muted-foreground">{result.feedback}</p>
                <p className="text-xs text-muted-foreground mt-1">{result.suggestion}</p>
              </div>
              <Button onClick={handleNext} className="w-full rounded-xl font-bold gap-2">
                {currentIdx + 1 < sentences.length ? 'Câu tiếp theo' : 'Hoàn thành'} <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
