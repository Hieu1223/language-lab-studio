import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('dictionary');
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
            <Wand2 className="w-4 h-4 text-primary" /> {t('tokenize.dialogTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('tokenize.dialogDesc')}
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
