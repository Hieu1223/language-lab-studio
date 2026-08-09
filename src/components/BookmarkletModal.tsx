import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { generateBookmarkletCode, getCurrentAppUrl } from '@/lib/bookmarklet';

interface BookmarkletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BookmarkletModal({ isOpen, onClose }: BookmarkletModalProps) {
  const { t } = useTranslation('common');

  if (!isOpen) return null;

  const appUrl = getCurrentAppUrl();
  const bookmarkletCode = generateBookmarkletCode({ appUrl });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border rounded-2xl max-w-2xl w-full shadow-2xl">
        {/* Header */}
        <div className="bg-card border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg">{t('bookmarklet.title')}</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {t('bookmarklet.subtitle')}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={t('actions.close')}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Draggable bookmarklet */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">{t('bookmarklet.step1Title')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('bookmarklet.step1Desc')}
            </p>
            <div className="bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 rounded-xl p-4 flex items-center justify-center">
              <a
                href={bookmarkletCode}
                draggable
                className="select-none cursor-move px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl active:scale-95 inline-block"
                title={t('bookmarklet.dragTitle')}
              >
                {t('bookmarklet.dragLabel')}
              </a>
            </div>
            <p className="text-xs text-muted-foreground bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              💡 <strong>{t('bookmarklet.tipLabel')}</strong> {t('bookmarklet.tipText')}
            </p>
          </div>

          {/* How to use */}
          <div className="border-t pt-4 space-y-3">
            <h3 className="font-semibold text-sm">{t('bookmarklet.step2Title')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('bookmarklet.step2Desc')}
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
              <li>{t('bookmarklet.bullet1')}</li>
              <li>{t('bookmarklet.bullet2')}</li>
              <li>{t('bookmarklet.bullet3')}</li>
            </ul>
          </div>

          {/* Success message */}
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <p className="text-sm text-green-700 dark:text-green-400">
              {t('bookmarklet.success')}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-card border-t px-6 py-4 flex justify-end">
          <Button onClick={onClose} variant="default">
            {t('actions.done')}
          </Button>
        </div>
      </div>
    </div>
  );
}
