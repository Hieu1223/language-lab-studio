import { useTranslation } from 'react-i18next';
import YouTubeBrowsePage from './YouTubeBrowsePage';

export default function VideoPageWithTabs() {
  const { t } = useTranslation('transcription');

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto animate-fade-in">

      <YouTubeBrowsePage />
    </div>
  );
}
