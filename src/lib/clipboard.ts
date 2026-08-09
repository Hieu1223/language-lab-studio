import { toast } from 'sonner';

import { translate } from '@/lib/i18n-runtime';

/**
 * Copies `text` to the clipboard, falling back to a hidden textarea when the
 * async Clipboard API is unavailable (insecure contexts / older browsers).
 * Toast messages use `translate` so this stays callable outside React.
 */
export async function copyToClipboard(text: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    toast.success(translate('manga:reader.copied', 'Đã sao chép'));
  } catch {
    toast.error(translate('manga:reader.copyFailed', 'Không thể sao chép'));
  }
}
