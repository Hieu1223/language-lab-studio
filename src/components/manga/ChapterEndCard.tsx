import { ArrowLeft, SkipBack, SkipForward } from 'lucide-react';

import { BG_COLOR } from '@/components/manga/reader-types';
import { Button } from '@/components/ui/button';
import type { ChapterPreview } from '@/lib/api/manga';

/** Short human label for a chapter ("Ch. 12", or its title when unnumbered). */
export function chapterLabel(ch: ChapterPreview) {
  return ch.chapter_index != null ? `Ch. ${ch.chapter_index}` : ch.title;
}

export interface ChapterEndCardProps {
  width: number | string;
  height: number | string;
  currentChapter: ChapterPreview | null;
  prevChapter: ChapterPreview | null;
  nextChapter: ChapterPreview | null;
  onGoToChapter: (chapter: ChapterPreview) => void;
  onBackToManga: () => void;
  onBackToLastPage: () => void;
}

/**
 * Terminal "end of chapter" slide shown after the last page, offering
 * prev/next chapter navigation and a way back to the final page.
 */
export function ChapterEndCard({
  width,
  height,
  currentChapter,
  prevChapter,
  nextChapter,
  onGoToChapter,
  onBackToManga,
  onBackToLastPage,
}: ChapterEndCardProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-6 text-center px-8"
      style={{ width, height, background: BG_COLOR }}
    >
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground uppercase tracking-widest">Hết chương</p>
        <p className="text-xl font-bold text-foreground">
          {currentChapter ? chapterLabel(currentChapter) : ''}
        </p>
        {currentChapter?.title && (
          <p className="text-sm text-muted-foreground">{currentChapter.title}</p>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        {prevChapter && (
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => onGoToChapter(prevChapter)}
          >
            <SkipBack className="w-4 h-4" />
            <span className="truncate">{chapterLabel(prevChapter)}</span>
          </Button>
        )}
        {nextChapter ? (
          <Button className="flex-1 gap-2" onClick={() => onGoToChapter(nextChapter)}>
            <span className="truncate">{chapterLabel(nextChapter)}</span>
            <SkipForward className="w-4 h-4" />
          </Button>
        ) : (
          <Button variant="outline" className="flex-1 gap-2" onClick={onBackToManga}>
            <ArrowLeft className="w-4 h-4" /> Về trang manga
          </Button>
        )}
      </div>
      <button
        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
        onClick={onBackToLastPage}
      >
        ← Quay lại trang cuối
      </button>
    </div>
  );
}

export default ChapterEndCard;
