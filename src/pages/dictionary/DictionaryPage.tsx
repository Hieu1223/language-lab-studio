import { BookOpen, Wand2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { TokenizeSentencePanel } from '@/components/dictionary/TokenizedSentence';
import { WordLookupPanel } from '@/components/dictionary/WordLookupPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DictionaryPage() {
  const { t } = useTranslation('dictionary');
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in" data-testid="dictionary-page">
      <header className="mb-6">
        <h1 className="font-display font-bold text-2xl md:text-3xl text-foreground flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" /> {t('page.title')}
        </h1>
      </header>

      <Tabs defaultValue="words">
        <TabsList className="mb-4">
          <TabsTrigger value="words" className="gap-1.5" data-testid="tab-words">
            <BookOpen className="w-3.5 h-3.5" /> {t('page.tabVocab')}
          </TabsTrigger>
          <TabsTrigger value="sentence" className="gap-1.5" data-testid="tab-sentence">
            <Wand2 className="w-3.5 h-3.5" /> {t('page.tabSentence')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="words">
          <WordLookupPanel />
        </TabsContent>

        <TabsContent value="sentence">
          <TokenizeSentencePanel initialText="" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
