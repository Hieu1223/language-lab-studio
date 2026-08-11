import { BookOpen, Wand2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { TokenizeSentencePanel } from '@/components/dictionary/TokenizedSentence';
import { WordLookupPanel } from '@/components/dictionary/WordLookupPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DictionaryPage() {
  const { t } = useTranslation('dictionary');
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in" data-testid="dictionary-page">
      <Tabs defaultValue="sentence">
        <TabsList className="mb-4 w-full grid grid-cols-2 sm:inline-flex sm:w-auto h-11 sm:h-10">
          <TabsTrigger value="sentence" className="gap-1.5 text-xs sm:text-sm" data-testid="tab-sentence">
            <Wand2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{t('page.tabSentence')}</span>
          </TabsTrigger>
          <TabsTrigger value="words" className="gap-1.5 text-xs sm:text-sm" data-testid="tab-words">
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{t('page.tabVocab')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sentence">
          <TokenizeSentencePanel initialText="" />
        </TabsContent>

        <TabsContent value="words">
          <WordLookupPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
