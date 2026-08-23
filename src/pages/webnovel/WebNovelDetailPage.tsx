import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, BookOpen, Calendar, Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getNovel, type WebNovelResponse } from '@/lib/api/webnovel';

function novelLabel(novel: WebNovelResponse, fallback: string) {
  return novel.chapters?.[0]?.name || fallback;
}

export default function WebNovelDetailPage() {
  const { t } = useTranslation('webnovel');
  const { t: tc } = useTranslation('common');
  const { novelId } = useParams<{ novelId: string }>();
  const navigate = useNavigate();
  const [novel, setNovel] = useState<WebNovelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!novelId) return;
    let cancelled = false;
    setLoading(true);
    getNovel(decodeURIComponent(novelId))
      .then((data) => { if (!cancelled) setNovel(data); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : t('detail.loadFailed')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [novelId, t]);

  const chapters = useMemo(() => novel ? [...(novel.chapters ?? [])].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })) : [], [novel]);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (error || !novel || !novelId) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-destructive">{error || t('detail.noData')}</p>
        <Button onClick={() => navigate('/webnovel')}>{tc('actions.back')}</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl animate-fade-in p-4 md:p-6" data-testid="webnovel-detail-page">
      <Button variant="ghost" size="sm" className="mb-5" onClick={() => navigate('/webnovel')}><ArrowLeft className="mr-1.5 h-4 w-4" />{tc('actions.back')}</Button>
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="font-display text-2xl">{novelLabel(novel, t('browse.untitled'))}</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">{t('detail.author', { author: novel.author })}</p>
            </div>
            <Badge variant="outline" className="gap-1"><BookOpen className="h-3.5 w-3.5" />{t('detail.chapterCount', { count: chapters.length })}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {novel.date_published && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Calendar className="h-3.5 w-3.5" />{new Date(novel.date_published).toLocaleDateString()}</p>}
          <div>
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('detail.summary')}</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed">{novel.summary || t('detail.noSummary')}</p>
          </div>
        </CardContent>
      </Card>

      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">{t('detail.chapterList')}</h2>
          <span className="text-xs text-muted-foreground">{t('detail.chapterCount', { count: chapters.length })}</span>
        </div>
        {chapters.length === 0 ? (
          <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{t('detail.noChapters')}</p>
        ) : (
          <div className="space-y-2">
            {chapters.map((chapter, index) => (
              <Card key={chapter.id} className="cursor-pointer transition-colors hover:border-primary/50" onClick={() => navigate(`/webnovel/${encodeURIComponent(novel.id)}/read/${encodeURIComponent(chapter.id)}`)} data-testid={`webnovel-chapter-${chapter.id}`}>
                <CardContent className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{chapter.name || t('detail.chapterFallback', { index: index + 1 })}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(chapter.updated_at).toLocaleDateString()}</p></div>
                  <BookOpen className="h-4 w-4 shrink-0 text-primary" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
