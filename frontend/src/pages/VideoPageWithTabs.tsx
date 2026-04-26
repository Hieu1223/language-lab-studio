import { useState } from 'react';
import { Video, History } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import YouTubeBrowsePage from './YouTubeBrowsePage';
import TranscriptionHistoryPage from './TranscriptionHistoryPage';

export default function VideoPageWithTabs() {
  const [activeTab, setActiveTab] = useState<'browse' | 'history'>('browse');

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h2 className="font-display font-bold text-2xl text-foreground mb-2">Phiên dịch Video</h2>
        <p className="text-sm text-muted-foreground">
          Tìm và phiên dịch các video YouTube để ôn tập tiếng Nhật
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'browse' | 'history')} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="browse" className="gap-2">
            <Video className="w-4 h-4" />
            Khám phá
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            Lịch sử
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="mt-0">
          <YouTubeBrowsePage />
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <TranscriptionHistoryPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
