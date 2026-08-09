import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookMarked, History } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MangaBrowse from './MangaBrowse';
import MangaHistoryPage from './MangaHistoryPage';

export default function MangaPage() {
  const { t } = useTranslation('manga');
  const [activeTab, setActiveTab] = useState<'browse' | 'history'>('browse');

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto animate-fade-in">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'browse' | 'history')} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="browse" className="gap-2">
            <BookMarked className="w-4 h-4" />
            {t('tabs.browse')}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            {t('tabs.history')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="mt-0">
          <MangaBrowse />
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <MangaHistoryPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
