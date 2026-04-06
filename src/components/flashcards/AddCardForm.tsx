import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { addCard } from '@/lib/api/flashcard';
import { Loader2 } from 'lucide-react';

interface AddCardFormProps {
  onAdded: () => void;
  onCancel: () => void;
}

export function AddCardForm({ onAdded, onCancel }: AddCardFormProps) {
  const [word, setWord] = useState('');
  const [meaning, setMeaning] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!word.trim() || !meaning.trim()) return;
    setLoading(true);
    await addCard(word.trim(), meaning.trim());
    setLoading(false);
    onAdded();
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-6 animate-fade-in">
      <h3 className="font-medium text-sm text-foreground mb-3">Thêm từ mới</h3>
      <p className="text-xs text-muted-foreground mb-3">Nhập từ và nghĩa, hệ thống sẽ tự phân loại từ loại và phiên âm.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input placeholder="Từ tiếng Nhật (例: 食べる)" value={word} onChange={e => setWord(e.target.value)} className="bg-background" />
        <Input placeholder="Nghĩa tiếng Việt (例: ăn)" value={meaning} onChange={e => setMeaning(e.target.value)} className="bg-background" />
      </div>
      <div className="flex gap-2 mt-3 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>Hủy</Button>
        <Button size="sm" onClick={handleSubmit} disabled={loading || !word || !meaning} className="gap-1">
          {loading && <Loader2 className="w-3 h-3 animate-spin" />}
          Thêm
        </Button>
      </div>
    </div>
  );
}
