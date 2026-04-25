import { useState } from 'react';
import { TokenizeSentencePanel } from '@/components/dictionary/TokenizedSentence';
import { Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SAMPLES = [
  '今日はいい天気ですね。',
  '日本語を勉強しています。',
  '彼は東京に住んでいます。',
];

export default function TokenizationPage() {
  const [seed, setSeed] = useState('');

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto animate-fade-in" data-testid="tokenization-page">
      <header className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-2xl md:text-3xl text-foreground flex items-center gap-2">
            <Wand2 className="w-6 h-6 text-primary" /> Phân tích câu
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dán một câu tiếng Nhật bất kỳ — chúng tôi sẽ tách từng từ, tra từ điển và cho phép bạn lưu vào bộ flashcard.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {SAMPLES.map((s, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              className="text-xs gap-1.5 font-japanese"
              onClick={() => setSeed(s)}
              data-testid={`sample-sentence-${i}`}
            >
              <Sparkles className="w-3 h-3 text-primary" />
              {s}
            </Button>
          ))}
        </div>
      </header>

      <TokenizeSentencePanel
        key={seed /* remount when sample changes so initial value applies */}
        initialText={seed}
      />
    </div>
  );
}
