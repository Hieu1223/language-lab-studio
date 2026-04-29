import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Wand2 } from 'lucide-react';
import { TokenizeSentencePanel } from '@/components/dictionary/TokenizedSentence';

interface SentenceTokenizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  text: string;
}

/**
 * Modal that runs `tokenize` on a selected sentence (e.g. from the
 * character-level transcript or manga OCR), and lets the user save
 * tokens to a deck.
 */
export function SentenceTokenizeDialog({
  open,
  onOpenChange,
  text,
}: SentenceTokenizeDialogProps) {
  // Reset key when dialog opens with new text
  const [opened, setOpened] = useState(0);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) setOpened((x) => x + 1);
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="sentence-tokenize-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-primary" /> Phân tích câu
          </DialogTitle>
          <DialogDescription>
            Tách câu thành từng từ, tra từ điển và lưu vào bộ flashcard.
          </DialogDescription>
        </DialogHeader>

        <TokenizeSentencePanel
          key={opened}
          initialText={text}
          readOnly
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
