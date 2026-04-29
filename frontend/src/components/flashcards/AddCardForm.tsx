import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { addCard } from '@/lib/api/flashcard';
import { Loader2 } from 'lucide-react';

interface AddCardFormProps {
  userId: string;
  defaultTopicId: string;
  defaultCollectionId: string;
  onAdded: () => void;
  onCancel: () => void;
}

export function AddCardForm({ userId, defaultTopicId, defaultCollectionId, onAdded, onCancel }: AddCardFormProps) {
  const [word, setWord] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!word.trim()) return;
    setLoading(true);
    await addCard(userId, word.trim(), defaultTopicId, defaultCollectionId);
    setLoading(false);
    setWord('');
    onAdded();
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 mb-4">
      <p className="text-xs text-muted-foreground mb-2">Nhập từ tiếng Nhật — nghĩa tự động tạo.</p>
      <div className="flex gap-2">
        <Input value={word} onChange={e => setWord(e.target.value)} placeholder="Từ tiếng Nhật..." className="bg-background border-border rounded-xl" onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        <Button onClick={handleSubmit} size="sm" disabled={!word.trim() || loading} className="gap-1">
          {loading && <Loader2 className="w-3 h-3 animate-spin" />}
          Thêm
        </Button>
        <Button onClick={onCancel} variant="ghost" size="sm">Huỷ</Button>
      </div>
    </div>
  );
}
