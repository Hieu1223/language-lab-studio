import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  BookOpen,
  AlignJustify,
  ScanText,
  ArrowLeft,
  PanelRightClose,
  PanelRightOpen,
  ZoomIn,
  ZoomOut,
  Maximize2,
  List,
  SkipForward,
  SkipBack,
  Copy,
  Loader2,
  Type,
  Wand2,
  BookmarkPlus,
  Search,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { LoadingScreen } from '@/components/LoadingScreen';
import { SentenceTokenizeDialog } from '@/components/dictionary/SentenceTokenizeDialog';
import { AddToDeckDialog } from '@/components/dictionary/AddToDeckDialog';
import { searchWords, type WordResponse } from '@/lib/api/flashcard';
import { searchKanji, getKanji, type KanjiResponse } from '@/lib/api/tokenization';
import {
  getChapterRead,
  getOCRResult,
  getOCRDataStream,
  upsertMangaHistory,
  type ChapterPreview,
  type OCRPage,
  type OCRStreamHandle,
} from '@/lib/api/manga';
import { APIError } from '@/lib/api-client';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReadMode = 'single' | 'vertical';
type PanelTab = 'settings' | 'chapters' | 'text' | 'dictionary';

interface SelectedBlock {
  pageIdx: number;
  blockIdx: number;
}

const SETTINGS_KEY = 'manga-reader-settings-v2';
const MIN_ZOOM = 50;
const MAX_ZOOM = 300;
const ZOOM_STEP = 10;
const MIN_PADDING = 0;
const MAX_PADDING = 30;
const BG_COLOR = '#1a1b26';

// ─── Copy helper ──────────────────────────────────────────────────────────────

async function copyToClipboard(text: string) {
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
    toast.success('Đã sao chép');
  } catch {
    toast.error('Không thể sao chép');
  }
}

// ─── OCR Overlay ──────────────────────────────────────────────────────────────

interface OCROverlayProps {
  ocrData: OCRPage;
  imgW: number;
  imgH: number;
  showBoxes: boolean;
  boxPadding: number;
  pageIdx: number;
  selectedBlock: SelectedBlock | null;
  onSelectBlock: (pageIdx: number, blockIdx: number) => void;
}

function OCROverlay({
  ocrData,
  imgW,
  imgH,
  showBoxes,
  boxPadding,
  pageIdx,
  selectedBlock,
  onSelectBlock,
}: OCROverlayProps) {
  const scaleX = imgW / ocrData.img_width;
  const scaleY = imgH / ocrData.img_height;

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ userSelect: 'text', pointerEvents: 'none' }}
    >
      {ocrData.blocks.map((block, idx) => {
        const [x1, y1, x2, y2] = block.box;
        const left = x1 * scaleX - boxPadding;
        const top = y1 * scaleY - boxPadding;
        const width = (x2 - x1) * scaleX + boxPadding * 2;
        const height = (y2 - y1) * scaleY + boxPadding * 2;
        const scaledFont = Math.max(8, block.font_size * Math.min(scaleX, scaleY));
        const text = block.lines.join('\n');
        const isSelected =
          selectedBlock?.pageIdx === pageIdx && selectedBlock?.blockIdx === idx;

        const borderCls = isSelected
          ? 'border-2 border-amber-400 bg-amber-400/20 rounded-sm shadow-lg'
          : showBoxes
            ? 'border-2 border-blue-400/70 bg-blue-400/10 rounded-sm hover:border-blue-400 hover:bg-blue-400/20'
            : 'border-2 border-transparent';

        return (
          <div
            key={idx}
            className={`absolute group transition-colors ${borderCls}`}
            style={{ left, top, width, height, pointerEvents: 'auto', cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectBlock(pageIdx, idx);
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                copyToClipboard(text);
              }}
              className={`absolute -top-2 -right-2 z-10 rounded-full p-1 bg-black/70 text-white hover:bg-primary hover:text-primary-foreground transition-opacity ${
                showBoxes || isSelected ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              aria-label="Copy OCR text"
              title="Copy toàn bộ text"
            >
              <Copy className="w-3 h-3" />
            </button>

            {block.vertical ? (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'row-reverse',
                  overflow: 'hidden',
                  cursor: 'text',
                  userSelect: 'text',
                  WebkitUserSelect: 'text',
                }}
              >
                {block.lines.map((line, li) => (
                  <div
                    key={li}
                    style={{
                      flex: '1 1 0',
                      writingMode: 'vertical-rl',
                      textOrientation: 'mixed',
                      fontSize: scaledFont,
                      lineHeight: 1,
                      color: 'transparent',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      userSelect: 'text',
                      WebkitUserSelect: 'text',
                    }}
                  >
                    {line}
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  cursor: 'text',
                  userSelect: 'text',
                  WebkitUserSelect: 'text',
                }}
              >
                {block.lines.map((line, li) => (
                  <div
                    key={li}
                    style={{
                      flex: '1 1 0',
                      fontSize: scaledFont,
                      lineHeight: 1,
                      color: 'transparent',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      userSelect: 'text',
                      WebkitUserSelect: 'text',
                    }}
                  >
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Manga Page ───────────────────────────────────────────────────────────────

interface MangaPageProps {
  src: string;
  pageIndex: number;
  ocrData: OCRPage | null;
  showOCRBoxes: boolean;
  boxPadding: number;
  fitMode: 'contain' | 'width';
  containerW?: number;
  containerH?: number;
  selectedBlock: SelectedBlock | null;
  onSelectBlock: (pageIdx: number, blockIdx: number) => void;
}

function MangaPage({
  src,
  pageIndex,
  ocrData,
  showOCRBoxes,
  boxPadding,
  fitMode,
  containerW = 0,
  containerH = 0,
  selectedBlock,
  onSelectBlock,
}: MangaPageProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [renderedSize, setRenderedSize] = useState({ w: 0, h: 0, left: 0, top: 0 });

  const computeRendered = useCallback(() => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return;
    if (fitMode === 'width') {
      setRenderedSize({ w: img.offsetWidth, h: img.offsetHeight, left: 0, top: 0 });
    } else {
      const natAr = img.naturalWidth / img.naturalHeight;
      const boxAr = containerW / containerH;
      let rw: number, rh: number;
      if (natAr > boxAr) {
        rw = containerW;
        rh = containerW / natAr;
      } else {
        rh = containerH;
        rw = containerH * natAr;
      }
      const left = (containerW - rw) / 2;
      const top = (containerH - rh) / 2;
      setRenderedSize({ w: rw, h: rh, left, top });
    }
  }, [fitMode, containerW, containerH]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete && img.naturalWidth) computeRendered();
    img.addEventListener('load', computeRendered);
    const ro = new ResizeObserver(computeRendered);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => {
      img.removeEventListener('load', computeRendered);
      ro.disconnect();
    };
  }, [src, computeRendered]);

  useEffect(() => {
    computeRendered();
  }, [computeRendered, containerW, containerH]);

  if (fitMode === 'contain') {
    return (
      <div
        ref={wrapRef}
        style={{ width: containerW, height: containerH, position: 'relative', flexShrink: 0 }}
      >
        <img
          ref={imgRef}
          src={src}
          alt={`Page ${pageIndex + 1}`}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          draggable={false}
          onLoad={computeRendered}
        />
        {ocrData && renderedSize.w > 0 && (
          <div
            style={{
              position: 'absolute',
              left: renderedSize.left,
              top: renderedSize.top,
              width: renderedSize.w,
              height: renderedSize.h,
            }}
          >
            <OCROverlay
              ocrData={ocrData}
              imgW={renderedSize.w}
              imgH={renderedSize.h}
              showBoxes={showOCRBoxes}
              boxPadding={boxPadding}
              pageIdx={pageIndex}
              selectedBlock={selectedBlock}
              onSelectBlock={onSelectBlock}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <img
        ref={imgRef}
        src={src}
        alt={`Page ${pageIndex + 1}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        draggable={false}
        onLoad={computeRendered}
      />
      {ocrData && renderedSize.w > 0 && (
        <OCROverlay
          ocrData={ocrData}
          imgW={renderedSize.w}
          imgH={renderedSize.h}
          showBoxes={showOCRBoxes}
          boxPadding={boxPadding}
          pageIdx={pageIndex}
          selectedBlock={selectedBlock}
          onSelectBlock={onSelectBlock}
        />
      )}
    </div>
  );
}

// ─── Dictionary Panel ─────────────────────────────────────────────────────────

function DictionaryRightPanel() {
  const [mode, setMode] = useState<'words' | 'kanji'>('words');

  const [wordQ, setWordQ] = useState('');
  const [wordResults, setWordResults] = useState<WordResponse[]>([]);
  const [wordLoading, setWordLoading] = useState(false);
  const [wordAddOpen, setWordAddOpen] = useState(false);
  const [pickedWord, setPickedWord] = useState<WordResponse | null>(null);

  const [kanjiReading, setKanjiReading] = useState('');
  const [kanjiSingle, setKanjiSingle] = useState('');
  const [kanjiResults, setKanjiResults] = useState<KanjiResponse[]>([]);
  const [activeKanji, setActiveKanji] = useState<KanjiResponse | null>(null);
  const [kanjiLoading, setKanjiLoading] = useState(false);
  const [kanjiAddOpen, setKanjiAddOpen] = useState(false);

  const doWordSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!wordQ.trim()) return;
    try {
      setWordLoading(true);
      const data = await searchWords(wordQ.trim(), 30);
      setWordResults(data);
      if (data.length === 0) toast.info('Không tìm thấy từ phù hợp');
    } catch {
      toast.error('Tìm kiếm thất bại');
    } finally {
      setWordLoading(false);
    }
  };

  const doKanjiReadingSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!kanjiReading.trim()) return;
    try {
      setKanjiLoading(true);
      setActiveKanji(null);
      const data = await searchKanji(kanjiReading.trim(), 30);
      setKanjiResults(data);
      if (data.length === 0) toast.info('Không tìm thấy kanji');
    } catch {
      toast.error('Tìm kanji thất bại');
    } finally {
      setKanjiLoading(false);
    }
  };

  const doKanjiLookup = async () => {
    const c = kanjiSingle.trim().slice(0, 1);
    if (!c) return;
    try {
      setKanjiLoading(true);
      const k = await getKanji(c);
      setActiveKanji(k);
    } catch {
      toast.error('Không tìm thấy kanji này');
    } finally {
      setKanjiLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-3 py-2 border-b border-border flex gap-1 flex-shrink-0">
        <button
          onClick={() => setMode('words')}
          className={`flex-1 text-xs h-7 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5 ${
            mode === 'words' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted/50'
          }`}
        >
          <BookOpen className="w-3 h-3" /> Từ vựng
        </button>
        <button
          onClick={() => setMode('kanji')}
          className={`flex-1 text-xs h-7 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5 ${
            mode === 'kanji' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted/50'
          }`}
        >
          <Type className="w-3 h-3" /> Kanji
        </button>
      </div>

      {mode === 'words' ? (
        <>
          <form onSubmit={doWordSearch} className="p-3 flex gap-1.5 border-b border-border flex-shrink-0">
            <Input
              value={wordQ}
              onChange={(e) => setWordQ(e.target.value)}
              placeholder="Từ, kana hoặc nghĩa..."
              className="h-8 text-xs"
            />
            <Button type="submit" size="icon" className="h-8 w-8" disabled={wordLoading}>
              {wordLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            </Button>
          </form>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {wordResults.length === 0 && !wordLoading && (
                <div className="py-8 flex flex-col items-center text-muted-foreground gap-2 text-center">
                  <Sparkles className="w-6 h-6 opacity-40" />
                  <p className="text-xs leading-snug">Tìm từ tiếng Nhật ngay tại đây — kết quả có thể lưu vào bộ flashcard.</p>
                </div>
              )}
              {wordResults.map((w) => (
                <div key={w.id} className="rounded-md border bg-card p-2.5 hover:border-primary/40 transition-colors group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-base font-bold font-japanese leading-tight truncate">{w.word}</p>
                      <p className="text-[11px] text-muted-foreground font-japanese truncate">{w.reading}</p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 flex-shrink-0 opacity-60 group-hover:opacity-100"
                      title="Lưu vào bộ"
                      onClick={() => { setPickedWord(w); setWordAddOpen(true); }}
                    >
                      <BookmarkPlus className="w-3.5 h-3.5 text-primary" />
                    </Button>
                  </div>
                  <p className="text-[11px] mt-1 leading-snug line-clamp-3">{w.meaning}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
          <AddToDeckDialog
            open={wordAddOpen}
            onOpenChange={(o) => { setWordAddOpen(o); if (!o) setPickedWord(null); }}
            words={pickedWord ? [pickedWord] : []}
          />
        </>
      ) : (
        <>
          <div className="p-3 space-y-2 border-b border-border flex-shrink-0">
            <form onSubmit={doKanjiReadingSearch} className="flex gap-1.5">
              <Input
                value={kanjiReading}
                onChange={(e) => setKanjiReading(e.target.value)}
                placeholder="Hán-Việt (vd: nhật)..."
                className="h-8 text-xs"
              />
              <Button type="submit" size="icon" className="h-8 w-8" disabled={kanjiLoading}>
                <Search className="w-3.5 h-3.5" />
              </Button>
            </form>
            <div className="flex gap-1.5">
              <Input
                value={kanjiSingle}
                onChange={(e) => setKanjiSingle(e.target.value)}
                placeholder="Một kanji (vd: 日)"
                maxLength={1}
                className="h-8 text-base font-japanese"
              />
              <Button
                size="icon"
                className="h-8 w-8"
                disabled={kanjiLoading || !kanjiSingle.trim()}
                onClick={doKanjiLookup}
              >
                <Type className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3">
              {kanjiLoading && (
                <div className="py-6 flex justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              )}
              {!kanjiLoading && activeKanji && (
                <div className="rounded-md border bg-card p-3 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-4xl font-bold font-japanese leading-none">{activeKanji.kanji}</p>
                      {activeKanji.reading && (
                        <p className="text-[11px] text-muted-foreground font-japanese mt-1">{activeKanji.reading}</p>
                      )}
                    </div>
                    <Button size="sm" variant="ghost" className="h-6 text-[11px] px-2" onClick={() => setActiveKanji(null)}>
                      Đóng
                    </Button>
                  </div>
                  {activeKanji.meanings && <p className="text-xs leading-snug">{activeKanji.meanings}</p>}
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    {activeKanji.strokes != null && (
                      <span className="font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{activeKanji.strokes} nét</span>
                    )}
                    {activeKanji.radical && (
                      <span className="font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-japanese">Bộ {activeKanji.radical}</span>
                    )}
                  </div>
                  {activeKanji.words && activeKanji.words.length > 0 && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{activeKanji.words.length} từ liên quan</p>
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-1.5 gap-1" onClick={() => setKanjiAddOpen(true)}>
                          <BookmarkPlus className="w-3 h-3" /> Thêm tất cả
                        </Button>
                      </div>
                      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                        {activeKanji.words.map((w) => (
                          <div key={w.id} className="text-[11px] rounded bg-muted/40 p-1.5">
                            <p className="font-japanese font-semibold">
                              {w.word}{' '}
                              <span className="text-muted-foreground font-normal">{w.reading}</span>
                            </p>
                            <p className="text-muted-foreground line-clamp-2">{w.meaning}</p>
                          </div>
                        ))}
                      </div>
                      <AddToDeckDialog
                        open={kanjiAddOpen}
                        onOpenChange={setKanjiAddOpen}
                        words={activeKanji.words}
                        title={`Thêm ${activeKanji.words.length} từ chứa "${activeKanji.kanji}"`}
                      />
                    </div>
                  )}
                </div>
              )}
              {!kanjiLoading && !activeKanji && kanjiResults.length > 0 && (
                <div className="grid grid-cols-3 gap-1.5">
                  {kanjiResults.map((k) => (
                    <button
                      key={k.id}
                      onClick={() => setActiveKanji(k)}
                      className="rounded-md border bg-card p-2 text-center hover:border-primary/60 transition-colors"
                    >
                      <p className="text-2xl font-bold font-japanese leading-tight">{k.kanji}</p>
                      {k.reading && (
                        <p className="text-[9px] text-muted-foreground font-japanese truncate mt-0.5">{k.reading}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {!kanjiLoading && !activeKanji && kanjiResults.length === 0 && (
                <div className="py-8 flex flex-col items-center text-muted-foreground gap-2 text-center">
                  <Sparkles className="w-6 h-6 opacity-40" />
                  <p className="text-xs leading-snug">Tra cứu kanji theo Hán-Việt hoặc nhập trực tiếp một kanji.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────

interface ReaderSettings {
  readMode: ReadMode;
  showOCRBoxes: boolean;
  boxPadding: number;
  zoom: number;
}

const DEFAULT_SETTINGS: ReaderSettings = {
  readMode: 'single',
  showOCRBoxes: true,
  boxPadding: 0,
  zoom: 100,
};

function loadSettings(): ReaderSettings {
  try {
    const s = localStorage.getItem(SETTINGS_KEY);
    if (s) return { ...DEFAULT_SETTINGS, ...JSON.parse(s) };
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

function clampIdx(i: number, len: number) {
  if (len === 0) return 0;
  return Math.max(0, Math.min(i, len - 1));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MangaReaderPage() {
  // Route: /manga/:mangaId/read/:chapterId  (both are UUIDs)
  const { mangaId, chapterId } = useParams<{ mangaId: string; chapterId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── Chapter / page data ─────────────────────────────────────────────────
  const [mangaTitle, setMangaTitle] = useState('');
  const [mangaCover, setMangaCover] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [chapters, setChapters] = useState<ChapterPreview[]>([]);
  const [currentChapterIdx, setCurrentChapterIdx] = useState(-1);
  const [currentChapter, setCurrentChapter] = useState<ChapterPreview | null>(null);
  const [loadingChapter, setLoadingChapter] = useState(true);

  // ── OCR ──────────────────────────────────────────────────────────────────
  const [ocrDataPages, setOcrDataPages] = useState<(OCRPage | null)[]>([]);
  const [ocrLoaded, setOcrLoaded] = useState(false);
  const [loadingOCR, setLoadingOCR] = useState(false);
  const [ocrPagesReceived, setOcrPagesReceived] = useState(0);
  const ocrStreamRef = useRef<OCRStreamHandle | null>(null);
  const ocrPageCounterRef = useRef(0);

  // ── Settings ─────────────────────────────────────────────────────────────
  const [settings, setSettings] = useState<ReaderSettings>(loadSettings);
  const { readMode, showOCRBoxes, boxPadding, zoom } = settings;

  const updateSettings = (patch: Partial<ReaderSettings>) =>
    setSettings((s) => ({ ...s, ...patch }));
  const setReadMode = (v: ReadMode) => updateSettings({ readMode: v });
  const setShowOCRBoxes = (v: boolean) => updateSettings({ showOCRBoxes: v });
  const setBoxPadding = (v: number) => updateSettings({ boxPadding: v });
  const setZoom = (v: number | ((prev: number) => number)) =>
    setSettings((s) => ({
      ...s,
      zoom: typeof v === 'function' ? (v as (prev: number) => number)(s.zoom) : v,
    }));

  useEffect(() => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
  }, [settings]);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelTab, setPanelTab] = useState<PanelTab>('settings');
  const [selectedBlock, setSelectedBlock] = useState<SelectedBlock | null>(null);
  const [tokenizeOpen, setTokenizeOpen] = useState(false);
  const [quickAddText, setQuickAddText] = useState<string | null>(null);
  const [quickAddWords, setQuickAddWords] = useState<WordResponse[]>([]);

  // ── Viewer size ───────────────────────────────────────────────────────────
  const viewerRef = useRef<HTMLDivElement>(null);
  const [viewerSize, setViewerSize] = useState({ w: 0, h: 0 });

  const setViewerNode = useCallback((node: HTMLDivElement | null) => {
    viewerRef.current = node;
    if (!node) return;
    const measure = () => {
      const r = node.getBoundingClientRect();
      setViewerSize((prev) =>
        prev.w === r.width && prev.h === r.height ? prev : { w: r.width, h: r.height },
      );
    };
    measure();
    requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    (node as unknown as { __ro?: ResizeObserver }).__ro?.disconnect?.();
    (node as unknown as { __ro?: ResizeObserver }).__ro = ro;
  }, []);

  const verticalContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // ── Persist page position per chapter ────────────────────────────────────
  const storageKey = `manga-reader-${mangaId}-${chapterId}`;

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const n = parseInt(saved, 10);
      if (!isNaN(n)) setCurrentPageIndex(n);
    }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, String(currentPageIndex));
  }, [currentPageIndex, storageKey]);

  // ── Load chapter data from single API call ────────────────────────────────
  useEffect(() => {
    if (!chapterId) return;

    const load = async () => {
      try {
        setLoadingChapter(true);
        // Abort any in-flight OCR stream
        ocrStreamRef.current?.abort();
        ocrStreamRef.current = null;
        ocrPageCounterRef.current = 0;
        setOcrLoaded(false);
        setOcrPagesReceived(0);
        setLoadingOCR(false);
        setOcrDataPages([]);
        setSelectedBlock(null);
        setCurrentPageIndex(0);

        const data = await getChapterRead(chapterId);

        setMangaTitle(data.manga.title);
        setMangaCover(data.manga.cover);
        setImages(data.pages);
        setChapters(data.chapters);
        setCurrentChapter(data.chapter);
        setOcrDataPages(new Array(data.pages.length).fill(null));
        pageRefs.current = new Array(data.pages.length).fill(null);

        // Find current chapter index in the list
        const idx = data.chapters.findIndex((c) => c.id === data.chapter.id);
        setCurrentChapterIdx(idx);

        // Save history (fire-and-forget)
        if (user?.id && mangaId) {
          upsertMangaHistory({
            manga_id: mangaId,
            chapter_id: chapterId,
            current_page: 0,
          }).catch((err) => console.warn('Failed to save manga history:', err));
        }

        // Auto-load OCR if already cached — silent, no toast on miss
        try {
          const existing = await getOCRResult(chapterId);
          const pages = existing.ocr_data.pages;
          setOcrDataPages(
            pages.length === data.pages.length
              ? pages
              : [...pages, ...new Array(Math.max(0, data.pages.length - pages.length)).fill(null)],
          );
          setOcrPagesReceived(pages.length);
          setOcrLoaded(true);
        } catch {
          // 404 = not yet OCR'd, that's fine — user can trigger manually
        }
      } catch (err) {
        toast.error('Không thể tải chapter');
        console.error(err);
        navigate(`/manga/${mangaId}`);
      } finally {
        setLoadingChapter(false);
      }
    };

    load();

    return () => {
      ocrStreamRef.current?.abort();
      ocrStreamRef.current = null;
    };
  }, [chapterId, mangaId, navigate, user?.id]);

  // ── Auto-save progress every 30s ─────────────────────────────────────────
  useEffect(() => {
    if (!user?.id || !mangaId || !chapterId || images.length === 0) return;
    const interval = setInterval(() => {
      upsertMangaHistory({
        manga_id: mangaId,
        chapter_id: chapterId,
        current_page: currentPageIndex,
      }).catch((err) => console.warn('Failed to auto-save reading progress:', err));
    }, 30_000);
    return () => clearInterval(interval);
  }, [user?.id, mangaId, chapterId, currentPageIndex, images.length]);

  // ── Keyboard navigation ───────────────────────────────────────────────────
  useEffect(() => {
    if (readMode === 'vertical') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        // Allow going one past the last image → end-of-chapter card
        setCurrentPageIndex((p) => Math.min(p + 1, images.length));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setCurrentPageIndex((p) => clampIdx(p - 1, images.length));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [readMode, images.length]);

  // ── Ctrl+wheel zoom ───────────────────────────────────────────────────────
  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP))));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // ── Vertical scroll page tracking ─────────────────────────────────────────
  useEffect(() => {
    if (readMode !== 'vertical') return;
    const container = verticalContainerRef.current;
    if (!container) return;
    const handler = () => {
      const scrollY = container.scrollTop;
      let closest = 0, minDist = Infinity;
      pageRefs.current.forEach((ref, i) => {
        if (ref) {
          const dist = Math.abs(ref.offsetTop - scrollY);
          if (dist < minDist) { minDist = dist; closest = i; }
        }
      });
      setCurrentPageIndex(closest);
    };
    container.addEventListener('scroll', handler, { passive: true });
    return () => container.removeEventListener('scroll', handler);
  }, [readMode, images.length]);

  // ── Load OCR ──────────────────────────────────────────────────────────────
  const loadOCR = async () => {
    if (loadingOCR || ocrLoaded || !chapterId) return;
    if (!images.length) { toast.error('Chưa có ảnh để OCR'); return; }

    // First check if OCR already exists (backend 409 if we stream twice)
    try {
      const existing = await getOCRResult(chapterId);
      // Already OCR'd — populate pages from cached data
      const pages = existing.ocr_data.pages;
      setOcrDataPages(pages.length === images.length ? pages : [...pages, ...new Array(Math.max(0, images.length - pages.length)).fill(null)]);
      setOcrPagesReceived(pages.length);
      setOcrLoaded(true);
      toast.success('OCR đã được tải từ cache');
      return;
    } catch (err) {
      // 404 = not yet OCR'd, proceed to stream
      if (err instanceof APIError && err.status !== 404) {
        toast.error('Không thể kiểm tra OCR');
        return;
      }
    }

    // Start streaming OCR
    setLoadingOCR(true);
    setOcrLoaded(false);
    setOcrPagesReceived(0);
    ocrPageCounterRef.current = 0;
    setOcrDataPages(new Array(images.length).fill(null));

    ocrStreamRef.current = getOCRDataStream(
      chapterId,
      (page) => {
        const idx = ocrPageCounterRef.current;
        ocrPageCounterRef.current += 1;
        setOcrDataPages((prev) => {
          const next = prev.length >= images.length ? prev.slice() : new Array(images.length).fill(null);
          if (idx < next.length) next[idx] = page;
          return next;
        });
        setOcrPagesReceived((c) => c + 1);
      },
      () => {
        setOcrLoaded(true);
        setLoadingOCR(false);
        ocrStreamRef.current = null;
        toast.success('OCR đã tải xong');
      },
      (err) => {
        // 409 = race: another client triggered OCR, try fetching the result
        if (err.message.includes('409')) {
          getOCRResult(chapterId!).then((existing) => {
            const pages = existing.ocr_data.pages;
            setOcrDataPages(pages.length === images.length ? pages : [...pages, ...new Array(Math.max(0, images.length - pages.length)).fill(null)]);
            setOcrPagesReceived(pages.length);
            setOcrLoaded(true);
            toast.success('OCR đã được tải từ cache');
          }).catch(() => toast.error('Không thể tải OCR'));
        } else {
          console.error(err);
          toast.error(`Không thể tải OCR: ${err.message}`);
        }
        setLoadingOCR(false);
        ocrStreamRef.current = null;
      },
    );
  };

  // ── Chapter navigation ────────────────────────────────────────────────────
  const goToChapter = useCallback(
    (chapter: ChapterPreview) => {
      navigate(`/manga/${mangaId}/read/${chapter.id}`);
    },
    [mangaId, navigate],
  );

  const prevChapter = currentChapterIdx > 0 ? chapters[currentChapterIdx - 1] : null;
  const nextChapter =
    currentChapterIdx >= 0 && currentChapterIdx < chapters.length - 1
      ? chapters[currentChapterIdx + 1]
      : null;

  // ── Page navigation ───────────────────────────────────────────────────────
  const goTo = (idx: number) => {
    // idx === images.length is valid — it's the end-of-chapter card
    const c = Math.min(Math.max(0, idx), images.length);
    setCurrentPageIndex(c);
    if (readMode === 'vertical' && c < images.length && pageRefs.current[c]) {
      pageRefs.current[c]!.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const prevPage = () => goTo(currentPageIndex - 1);
  const nextPage = () => goTo(currentPageIndex + 1);
  const clampZoom = (v: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v));

  const handleSelectBlock = useCallback((pageIdx: number, blockIdx: number) => {
    setSelectedBlock({ pageIdx, blockIdx });
    setPanelOpen(true);
    setPanelTab('text');
  }, []);

  // ── Quick-add word search ─────────────────────────────────────────────────
  useEffect(() => {
    if (!quickAddText) return;
    let cancelled = false;
    (async () => {
      try {
        const q = quickAddText.split('\n')[0].trim() || quickAddText.trim();
        const results = await searchWords(q, 10);
        if (!cancelled) {
          setQuickAddWords(results);
          if (results.length === 0) {
            toast.info('Không tìm được từ trong từ điển. Hãy phân tích câu trước.');
            setQuickAddText(null);
          }
        }
      } catch {
        if (!cancelled) toast.error('Không tìm được từ');
      }
    })();
    return () => { cancelled = true; };
  }, [quickAddText]);

  const selectedBlockData =
    selectedBlock ? ocrDataPages[selectedBlock.pageIdx]?.blocks[selectedBlock.blockIdx] ?? null : null;
  const selectedText = selectedBlockData ? selectedBlockData.lines.join('\n') : '';

  const zoomScale = zoom / 100;

  // ── Chapter label helper ──────────────────────────────────────────────────
  const chapterLabel = (ch: ChapterPreview) =>
    ch.chapter_index != null ? `Ch. ${ch.chapter_index}` : ch.title;

  // ── End-of-chapter card ───────────────────────────────────────────────────
  const EndCard = () => (
    <div
      className="flex flex-col items-center justify-center gap-6 text-center px-8"
      style={{ width: viewerSize.w || '100%', height: viewerSize.h || '100%', background: BG_COLOR }}
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
            onClick={() => goToChapter(prevChapter)}
          >
            <SkipBack className="w-4 h-4" />
            <span className="truncate">{chapterLabel(prevChapter)}</span>
          </Button>
        )}
        {nextChapter ? (
          <Button className="flex-1 gap-2" onClick={() => goToChapter(nextChapter)}>
            <span className="truncate">{chapterLabel(nextChapter)}</span>
            <SkipForward className="w-4 h-4" />
          </Button>
        ) : (
          <Button variant="outline" className="flex-1 gap-2" onClick={() => navigate(`/manga/${mangaId}`)}>
            <ArrowLeft className="w-4 h-4" /> Về trang manga
          </Button>
        )}
      </div>
      <button
        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
        onClick={() => goTo(images.length - 1)}
      >
        ← Quay lại trang cuối
      </button>
    </div>
  );

  // ── Render pages ──────────────────────────────────────────────────────────
  const renderPages = () => {
    if (readMode === 'vertical') {
      return (
        <div ref={verticalContainerRef} className="flex-1 overflow-auto" style={{ background: BG_COLOR }}>
          <div
            style={{
              transformOrigin: 'top center',
              transform: `scale(${zoomScale})`,
              ...(zoom !== 100 && {
                height: `${100 / zoomScale}%`,
                width: `${100 / zoomScale}%`,
                marginLeft: `${((zoomScale - 1) / 2) * 100}%`,
              }),
            }}
          >
            <div className="flex flex-col items-center gap-3 py-4 px-2">
              {images.map((src, i) => (
                <div
                  key={i}
                  ref={(el) => { pageRefs.current[i] = el; }}
                  style={{ width: '100%', maxWidth: 900 }}
                >
                  <MangaPage
                    src={src}
                    pageIndex={i}
                    ocrData={ocrDataPages[i]}
                    showOCRBoxes={showOCRBoxes}
                    boxPadding={boxPadding}
                    fitMode="width"
                    selectedBlock={selectedBlock}
                    onSelectBlock={handleSelectBlock}
                  />
                </div>
              ))}
              {/* End card at bottom of vertical scroll */}
              <div style={{ width: '100%', maxWidth: 900, minHeight: 320 }} className="flex items-center justify-center">
                <EndCard />
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Single mode — end card replaces the page when index === images.length
    const isEndCard = currentPageIndex >= images.length;

    return (
      <div
        className="flex-1 overflow-auto flex items-center justify-center"
        style={{ background: BG_COLOR }}
      >
        {isEndCard ? (
          <EndCard />
        ) : (
          images[currentPageIndex] && (
            <div style={{ transform: `scale(${zoomScale})`, transformOrigin: 'center center', flexShrink: 0 }}>
              <MangaPage
                src={images[currentPageIndex]}
                pageIndex={currentPageIndex}
                ocrData={ocrDataPages[currentPageIndex]}
                showOCRBoxes={showOCRBoxes}
                boxPadding={boxPadding}
                fitMode="contain"
                containerW={viewerSize.w}
                containerH={viewerSize.h}
                selectedBlock={selectedBlock}
                onSelectBlock={handleSelectBlock}
              />
            </div>
          )
        )}
      </div>
    );
  };

  if (loadingChapter) return <LoadingScreen isOpen message="Đang tải chapter..." />;

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground">Không tìm thấy ảnh</p>
        <Button onClick={() => navigate(`/manga/${mangaId}`)}>Quay lại</Button>
      </div>
    );
  }

  const isEndCard = currentPageIndex >= images.length;
  const pageLabel = isEndCard ? `Hết / ${images.length}` : `${currentPageIndex + 1} / ${images.length}`;

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="border-b border-border px-3 py-2 flex items-center justify-between flex-shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => navigate(`/manga/${mangaId}`)}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">
              {currentChapter ? chapterLabel(currentChapter) : ''}
              {currentChapter?.title ? ` ${currentChapter.title}` : ''}
            </p>
            <p className="text-xs text-muted-foreground">{mangaTitle} · {pageLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {readMode !== 'vertical' && (
            <Select value={String(currentPageIndex)} onValueChange={(v) => goTo(parseInt(v))}>
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {images.map((_, i) => (
                  <SelectItem key={i} value={String(i)} className="text-xs">
                    Page {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {(ocrLoaded || ocrPagesReceived > 0) && (
            <Button
              variant={showOCRBoxes ? 'default' : 'outline'}
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setShowOCRBoxes(!showOCRBoxes)}
            >
              {showOCRBoxes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              OCR
            </Button>
          )}

          {loadingOCR && (
            <div className="flex items-center gap-1 px-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              OCR {ocrPagesReceived}/{images.length}
            </div>
          )}

          {prevChapter && (
            <Button variant="ghost" size="icon" className="h-8 w-8" title={`Prev: ${chapterLabel(prevChapter)}`} onClick={() => goToChapter(prevChapter)}>
              <SkipBack className="w-4 h-4" />
            </Button>
          )}
          {nextChapter && (
            <Button variant="ghost" size="icon" className="h-8 w-8" title={`Next: ${chapterLabel(nextChapter)}`} onClick={() => goToChapter(nextChapter)}>
              <SkipForward className="w-4 h-4" />
            </Button>
          )}

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPanelOpen((v) => !v)}>
            {panelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Body — viewer always takes full width, panel floats over it */}
      <div className="flex-1 overflow-hidden min-h-0 relative">
        <div ref={setViewerNode} className="absolute inset-0 flex overflow-hidden">
          {renderPages()}

          {readMode !== 'vertical' && !isEndCard && (
            <>
              <button
                onClick={prevPage}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-20 w-10 flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors rounded-r-lg"
                aria-label="Previous"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={nextPage}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-20 w-10 flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors rounded-l-lg"
                aria-label="Next"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </>
          )}
        </div>

        {/* Right panel — overlays the reader, doesn't push it */}
        {panelOpen && (
          <>
            {/* Backdrop — tappable on mobile to close */}
            <div
              className="absolute inset-0 z-20 bg-black/40 sm:hidden"
              onClick={() => setPanelOpen(false)}
            />
            <div className="absolute top-0 right-0 bottom-0 z-30 w-72 max-w-[85vw] border-l border-border bg-card flex flex-col shadow-2xl">
              {/* Tab bar */}
              <div className="flex border-b border-border flex-shrink-0">
                {(['settings', 'chapters', 'text', 'dictionary'] as PanelTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setPanelTab(tab)}
                    className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
                      panelTab === tab ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab === 'chapters' ? (
                      <span className="flex items-center justify-center gap-1"><List className="w-3 h-3" /> Chapters</span>
                    ) : tab === 'text' ? (
                      <span className="flex items-center justify-center gap-1"><Type className="w-3 h-3" /> Text</span>
                    ) : tab === 'dictionary' ? (
                      <span className="flex items-center justify-center gap-1"><BookOpen className="w-3 h-3" /> Dict</span>
                    ) : 'Settings'}
                  </button>
                ))}
              </div>

            {/* Settings tab */}
            {panelTab === 'settings' && (
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-5">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Reading Mode</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {([
                        { value: 'single', label: 'Trang đơn', icon: BookOpen },
                        { value: 'vertical', label: 'Cuộn dọc', icon: AlignJustify },
                      ] as const).map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          onClick={() => setReadMode(value)}
                          className={`flex flex-col items-center gap-1 p-2 rounded-md border text-xs font-medium transition-colors ${
                            readMode === value
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
                          }`}
                        >
                          <Icon className="w-4 h-4" /> {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Zoom</Label>
                      <span className="text-xs font-mono text-muted-foreground">{zoom}%</span>
                    </div>
                    <Slider min={MIN_ZOOM} max={MAX_ZOOM} step={ZOOM_STEP} value={[zoom]} onValueChange={([v]) => setZoom(v)} className="w-full" />
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" size="icon" className="h-7 w-7 flex-1" onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))} disabled={zoom <= MIN_ZOOM}>
                        <ZoomOut className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 flex-1 text-xs" onClick={() => setZoom(100)}>
                        <Maximize2 className="w-3 h-3 mr-1" /> Reset
                      </Button>
                      <Button variant="outline" size="icon" className="h-7 w-7 flex-1" onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))} disabled={zoom >= MAX_ZOOM}>
                        <ZoomIn className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Ctrl + scroll để zoom</p>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">OCR / Text</Label>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ocr-boxes" className="text-sm cursor-pointer">Hiện bounding box</Label>
                      <Switch
                        id="ocr-boxes"
                        checked={showOCRBoxes}
                        onCheckedChange={setShowOCRBoxes}
                        disabled={!ocrLoaded && ocrPagesReceived === 0}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs cursor-pointer">Padding box</Label>
                        <span className="text-xs font-mono text-muted-foreground">{boxPadding}px</span>
                      </div>
                      <Slider min={MIN_PADDING} max={MAX_PADDING} step={1} value={[boxPadding]} onValueChange={([v]) => setBoxPadding(v)} className="w-full" />
                    </div>

                    <Button onClick={loadOCR} disabled={loadingOCR || ocrLoaded} size="sm" className="w-full h-8 text-xs gap-1.5">
                      {loadingOCR ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanText className="w-3.5 h-3.5" />}
                      {ocrLoaded ? 'OCR đã tải' : loadingOCR ? `Đang tải OCR ${ocrPagesReceived}/${images.length}…` : 'Tải OCR'}
                    </Button>

                    {(loadingOCR || ocrPagesReceived > 0) && (
                      <div className="space-y-1">
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${ocrLoaded ? 'bg-emerald-500' : 'bg-primary'}`}
                            style={{ width: `${images.length === 0 ? 0 : Math.min(100, Math.round((ocrPagesReceived / images.length) * 100))}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>{ocrPagesReceived}/{images.length} trang</span>
                          <span>{images.length === 0 ? '0%' : `${Math.round((ocrPagesReceived / images.length) * 100)}%`}</span>
                        </div>
                        {loadingOCR && (
                          <p className="text-[11px] text-muted-foreground leading-snug">
                            Bạn có thể tiếp tục đọc và sao chép text ở các trang đã tải xong.
                          </p>
                        )}
                      </div>
                    )}

                    {ocrLoaded && (
                      <p className="text-xs text-muted-foreground leading-snug">
                        Chạm vào bounding box để mở trong tab Text.
                      </p>
                    )}
                  </div>

                  <Separator />

                  {readMode !== 'vertical' && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Jump to Page</Label>
                      <Select value={String(currentPageIndex)} onValueChange={(v) => goTo(parseInt(v))}>
                        <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {images.map((_, i) => (
                            <SelectItem key={i} value={String(i)} className="text-xs">Page {i + 1}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Chapter</Label>
                    <div className="flex gap-1.5">
                      <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1" disabled={!prevChapter} onClick={() => prevChapter && goToChapter(prevChapter)}>
                        <SkipBack className="w-3.5 h-3.5" /> Prev
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1" disabled={!nextChapter} onClick={() => nextChapter && goToChapter(nextChapter)}>
                        Next <SkipForward className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            )}

            {/* Chapters tab */}
            {panelTab === 'chapters' && (
              <ScrollArea className="flex-1">
                {chapters.length === 0 ? (
                  <div className="p-4 text-xs text-muted-foreground">Không có chapter nào.</div>
                ) : (
                  <div className="py-1">
                    {chapters.map((ch, i) => {
                      const isActive = i === currentChapterIdx;
                      return (
                        <button
                          key={ch.id}
                          onClick={() => goToChapter(ch)}
                          className={`w-full text-left px-4 py-2.5 transition-colors ${
                            isActive ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted/50'
                          }`}
                        >
                          <p className="text-xs font-semibold">{chapterLabel(ch)}</p>
                          {ch.title && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{ch.title}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            )}

            {/* Text tab */}
            {panelTab === 'text' && (
              <div className="flex-1 flex flex-col min-h-0">
                {selectedBlockData ? (
                  <>
                    <div className="p-3 border-b border-border bg-muted/30 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold">
                          Page {selectedBlock!.pageIdx + 1} · Block {selectedBlock!.blockIdx + 1}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {selectedBlockData.vertical ? 'Dọc' : 'Ngang'} · {selectedBlockData.lines.length} dòng
                        </p>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => copyToClipboard(selectedText)}>
                        <Copy className="w-3.5 h-3.5" /> Copy
                      </Button>
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="p-4 space-y-3">
                        <textarea
                          readOnly
                          value={selectedText}
                          className="w-full min-h-[180px] p-3 text-sm leading-relaxed bg-background border rounded-md font-japanese resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 select-text"
                          style={{ fontFamily: '"Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif' }}
                        />
                        <div className="flex flex-col gap-2">
                          <Button size="sm" className="w-full gap-1.5" onClick={() => setTokenizeOpen(true)}>
                            <Wand2 className="w-3.5 h-3.5" /> Phân tích từ
                          </Button>
                          <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => setQuickAddText(selectedText)}>
                            <BookmarkPlus className="w-3.5 h-3.5" /> Lưu vào bộ
                          </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          Bạn có thể chọn một phần hoặc toàn bộ text phía trên rồi sao chép.
                        </p>
                      </div>
                    </ScrollArea>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-2">
                    <Type className="w-8 h-8 text-muted-foreground/50" />
                    <p className="text-sm font-medium text-muted-foreground">Chưa chọn bounding box</p>
                    <p className="text-xs text-muted-foreground">
                      {ocrLoaded
                        ? 'Chạm vào một bounding box trên trang để hiển thị text ở đây.'
                        : 'Tải OCR trước, sau đó chạm vào bounding box.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Dictionary tab */}
            {panelTab === 'dictionary' && <DictionaryRightPanel />}
          </div>
          </>
        )}
      </div>

      <SentenceTokenizeDialog open={tokenizeOpen} onOpenChange={setTokenizeOpen} text={selectedText} />
      <AddToDeckDialog
        open={!!quickAddText && quickAddWords.length > 0}
        onOpenChange={(o) => { if (!o) { setQuickAddText(null); setQuickAddWords([]); } }}
        words={quickAddWords}
        title={`Lưu từ tìm được (${quickAddWords.length})`}
      />
    </div>
  );
}