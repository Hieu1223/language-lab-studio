import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addCard } from '@/lib/api/flashcards';
import type { PartOfSpeech } from '@/lib/api/types';

const POS_OPTIONS: PartOfSpeech[] = ['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'particle', 'classifier', 'interjection'];

interface AddCardFormProps {
  onAdded: () => void;
  onCancel: () => void;
}

export function AddCardForm({ onAdded, onCancel }: AddCardFormProps) {
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [pos, setPos] = useState<PartOfSpeech>('noun');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!front.trim() || !back.trim()) return;
    setLoading(true);
    await addCard(front.trim(), back.trim(), pos);
    setLoading(false);
    onAdded();
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-6 animate-fade-in">
      <h3 className="font-medium text-sm text-foreground mb-3">Add New Card</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input placeholder="Front (Vietnamese)" value={front} onChange={e => setFront(e.target.value)} className="bg-background" />
        <Input placeholder="Back (English)" value={back} onChange={e => setBack(e.target.value)} className="bg-background" />
        <Select value={pos} onValueChange={v => setPos(v as PartOfSpeech)}>
          <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            {POS_OPTIONS.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 mt-3 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={handleSubmit} disabled={loading || !front || !back}>Add Card</Button>
      </div>
    </div>
  );
}
