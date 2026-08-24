import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, Languages, Loader2, PanelRightClose, PanelRightOpen } from 'lucide-react';

import { DictionaryPanel } from '@/components/dictionary/DictionaryPanel';
import { GrammarPanel } from '@/components/grammar/GrammarPanel';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getNovel, readChapter, upsertWebNovelHistory, type WebNovelChapterResponse, type WebNovelResponse } from '@/lib/api/webnovel';
import { TokenizedSentence } from '@/components/dictionary/TokenizedSentence';

function novelLabel(novel: WebNovelResponse, fallback: string) {
  return novel.chapters?.[0]?.name || fallback;
}

type PanelTab = 'dictionary' | 'grammar';

export default function WebNovelReaderPage() {
  const { t } = useTranslation('webnovel');
  const { t: tc } = useTranslation('common');
  const { novelId, chapterId } = useParams<{ novelId: string; chapterId: string }>();
  const navigate = useNavigate();
  const [novel, setNovel] = useState<WebNovelResponse | null>(null);
  const [chapter, setChapter] = useState<WebNovelChapterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelTab, setPanelTab] = useState<PanelTab>('dictionary');

  useEffect(() => {
    if (!novelId || !chapterId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([getNovel(decodeURIComponent(novelId)), readChapter(decodeURIComponent(chapterId))])
      .then(([novelData, chapterData]) => {
        if (cancelled) return;
        setNovel(novelData);
        setChapter(chapterData);
        void upsertWebNovelHistory({ web_novel_id: novelData.id, chapter_id: chapterData.id }).catch(() => undefined);
      })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : t('reader.loadFailed')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [chapterId, novelId, t]);

  const chapters = novel?.chapters ?? [];
  const chapterIndex = chapters.findIndex((item) => item.id === chapter?.id);
  const previousChapter = chapterIndex > 0 ? chapters[chapterIndex - 1] : null;
  const nextChapter = chapterIndex >= 0 && chapterIndex < chapters.length - 1 ? chapters[chapterIndex + 1] : null;
  const paragraphs = useMemo(
    () => (chapter?.content ?? '').split(/\r?\n(?:\s*\r?\n)*/).map((paragraph) => paragraph.trim()).filter(Boolean),
    [chapter?.content],
  );

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (error || !novel || !chapter || !novelId) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-destructive">{error || t('reader.noData')}</p>
        <Button onClick={() => navigate(novelId ? `/webnovel/${encodeURIComponent(novelId)}` : '/webnovel')}>{tc('actions.back')}</Button>
      </div>
    );
  }

  const goToChapter = (id: string) => navigate(`/webnovel/${encodeURIComponent(novel.id)}/read/${encodeURIComponent(id)}`);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background" data-testid="webnovel-reader-page">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate(`/webnovel/${encodeURIComponent(novel.id)}`)} aria-label={tc('actions.back')}><ArrowLeft className="h-4 w-4" /></Button>
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{chapter.name || t('detail.chapterFallback', { index: chapterIndex + 1 })}</p><p className="truncate text-xs text-muted-foreground">{novelLabel(novel, t('browse.untitled'))} · {novel.author}</p></div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!previousChapter} onClick={() => previousChapter && goToChapter(previousChapter.id)} aria-label={t('reader.previousChapter')}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="hidden text-xs text-muted-foreground sm:inline">{chapterIndex >= 0 ? `${chapterIndex + 1} / ${chapters.length}` : ''}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!nextChapter} onClick={() => nextChapter && goToChapter(nextChapter.id)} aria-label={t('reader.nextChapter')}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPanelOpen((open) => !open)} aria-label={panelOpen ? t('reader.closePanel') : t('reader.openPanel')}>
            {panelOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <article className="mx-auto max-w-3xl px-5 py-8 md:px-10 md:py-12">
              <div className="mb-8 border-b pb-5">
                <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{novel.author}</p>
                <h1 className="font-display text-2xl font-bold md:text-3xl">{chapter.name}</h1>
                <p className="mt-2 text-xs text-muted-foreground">{t('reader.paragraphCount', { count: paragraphs.length })}</p>
              </div>
              {paragraphs.length === 0 ? (
                <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{t('reader.emptyContent')}</p>
              ) : (
                <div className="space-y-6">
                  {paragraphs.map((paragraph, index) => (
                    <Card key={`${chapter.id}-${index}`} className="border-0 bg-transparent shadow-none">
                      <TokenizedSentence text={paragraph} compact className="font-japanese text-[1.05rem] leading-[2.1]" />
                    </Card>
                  ))}
                </div>
              )}
              <div className="mt-10 flex items-center justify-between gap-3 border-t pt-5">
                <Button variant="outline" size="sm" disabled={!previousChapter} onClick={() => previousChapter && goToChapter(previousChapter.id)}><ChevronLeft className="mr-1 h-4 w-4" />{t('reader.previousChapter')}</Button>
                <Button variant="outline" size="sm" disabled={!nextChapter} onClick={() => nextChapter && goToChapter(nextChapter.id)}>{t('reader.nextChapter')}<ChevronRight className="ml-1 h-4 w-4" /></Button>
              </div>
            </article>
          </ScrollArea>
        </main>

        {panelOpen && (
          <>
            <button type="button" aria-label={tc('actions.close')} className="absolute inset-0 z-20 bg-black/40 sm:hidden" onClick={() => setPanelOpen(false)} />
            <aside className="absolute right-0 top-0 z-30 flex h-full w-80 max-w-[88vw] flex-col border-l border-border bg-card shadow-2xl sm:relative sm:z-auto sm:shadow-none">
              <div className="flex shrink-0 border-b border-border">
                <button type="button" className={`flex-1 py-2 text-xs font-medium ${panelTab === 'dictionary' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'}`} onClick={() => setPanelTab('dictionary')}><span className="flex items-center justify-center gap-1"><BookOpen className="h-3 w-3" />{t('reader.tabDictionary')}</span></button>
                <button type="button" className={`flex-1 py-2 text-xs font-medium ${panelTab === 'grammar' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'}`} onClick={() => setPanelTab('grammar')}><span className="flex items-center justify-center gap-1"><Languages className="h-3 w-3" />{t('reader.tabGrammar')}</span></button>
              </div>
              {panelTab === 'dictionary' ? <DictionaryPanel /> : <GrammarPanel className="h-full" />}
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
