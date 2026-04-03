import { useState } from 'react';
import type { SentencePractice } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';

interface Props {
  sentence: SentencePractice;
  onSubmit: (answer: string) => void;
}

export function SentenceCard({ sentence, onSubmit }: Props) {
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    setSubmitting(true);
    await onSubmit(answer.trim());
    setSubmitting(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="mb-1">
        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${
          sentence.difficulty === 'beginner' ? 'bg-success/10 text-success border-success/20' :
          sentence.difficulty === 'intermediate' ? 'bg-warning/10 text-warning border-warning/20' :
          'bg-destructive/10 text-destructive border-destructive/20'
        }`}>
          {sentence.difficulty}
        </span>
      </div>

      <p className="text-xl font-display font-semibold text-foreground mt-4 mb-6 leading-relaxed">
        {sentence.vietnamese}
      </p>

      <Textarea
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        placeholder="Type your English translation..."
        className="bg-background border-border mb-3 min-h-[80px]"
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
      />

      <Button onClick={handleSubmit} disabled={submitting || !answer.trim()} className="gap-2">
        <Send className="w-4 h-4" /> Check
      </Button>
    </div>
  );
}
