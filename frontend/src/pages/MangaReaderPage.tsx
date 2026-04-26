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
import { LoadingScreen } from '@/components/LoadingScreen';
import { SentenceTokenizeDialog } from '@/components/dictionary/SentenceTokenizeDialog';
import { AddToDeckDialog } from '@/components/dictionary/AddToDeckDialog';
import { searchWords, type WordResponse } from '@/lib/api/flashcard-real';
import {
  getChapterImages,
  getOCRData,
  getChapterList,
  type ChapterInfo,
} from '@/lib/api/manga-real';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OCRBlock {
  box: [number, number, number, number];
  vertical: boolean;
  font_size: number;
  lines_coords: number[][][];
  lines: string[];
}

interface OCRPageData {
  version: string;
  img_width: number;
  img_height: number;
  blocks: OCRBlock[];
}

type ReadMode = 'single' | 'vertical';
type PanelTab = 'settings' | 'chapters' | 'text';

interface SelectedBlock {
  pageIdx: number;
  blockIdx: number;
}

const STORAGE_KEY_PREFIX = 'manga-reader-';
const SETTINGS_KEY = 'manga-reader-settings-v2';
const MIN_ZOOM = 50;
const MAX_ZOOM = 300;
const ZOOM_STEP = 10;
const MIN_PADDING = 0;
const MAX_PADDING = 30;
const BG_COLOR = '#1a1b26';

// ─── Copy helper ────────────────────────────────────────────────────────────

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
  ocrData: OCRPageData;
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
            style={{
              left,
              top,
              width,
              height,
              pointerEvents: 'auto',
              cursor: 'pointer',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectBlock(pageIdx, idx);
            }}
          >
            {/* Copy-all button (always accessible on touch too) */}
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

            {/* Transparent text for native selection */}
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
  ocrData: OCRPageData | null;
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
        style={{
          width: containerW,
          height: containerH,
          position: 'relative',
          flexShrink: 0,
        }}
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

// ─── Main ─────────────────────────────────────────────────────────────────────

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
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS;
}

export default function MangaReaderPage() {
  const { mangaId, chapterUrl } = useParams<{ mangaId: string; chapterUrl: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [images, setImages] = useState<string[]>([]);
  const [ocrDataPages, setOcrDataPages] = useState<(OCRPageData | null)[]>([]);
  const [ocrLoaded, setOcrLoaded] = useState(false);
  const [loadingImages, setLoadingImages] = useState(true);
  const [loadingOCR, setLoadingOCR] = useState(false);

  const [chapters, setChapters] = useState<ChapterInfo[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [currentChapterIdx, setCurrentChapterIdx] = useState(-1);

  const [settings, setSettings] = useState<ReaderSettings>(loadSettings);
  const { readMode, showOCRBoxes, boxPadding, zoom } = settings;

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelTab, setPanelTab] = useState<PanelTab>('settings');
  const [selectedBlock, setSelectedBlock] = useState<SelectedBlock | null>(null);
  const [tokenizeOpen, setTokenizeOpen] = useState(false);
  const [quickAddText, setQuickAddText] = useState<string | null>(null);
  const [quickAddWords, setQuickAddWords] = useState<WordResponse[]>([]);

  const viewerRef = useRef<HTMLDivElement>(null);
  const [viewerSize, setViewerSize] = useState({ w: 0, h: 0 });

  // Ref callback measures as soon as the element is attached.
  const setViewerNode = useCallback((node: HTMLDivElement | null) => {
    viewerRef.current = node;
    if (!node) return;
    const measure = () => {
      const r = node.getBoundingClientRect();
      setViewerSize((prev) =>
        prev.w === r.width && prev.h === r.height ? prev : { w: r.width, h: r.height },
      );
    };
    // Measure now and also after first paint
    measure();
    requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    // Stash cleanup on the node for later disconnection
    // (useEffect below will re-bind for subsequent renders)
    (node as unknown as { __ro?: ResizeObserver }).__ro?.disconnect?.();
    (node as unknown as { __ro?: ResizeObserver }).__ro = ro;
  }, []);

  const verticalContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const storageKey = `${STORAGE_KEY_PREFIX}${mangaId}-${chapterUrl}`;

  // Helpers
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

  // Persist settings
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  // ── Measure viewer (also handled by ref callback) ─────────────────────────
  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;
    const update = () =>
      setViewerSize((prev) => {
        const w = el.clientWidth;
        const h = el.clientHeight;
        return prev.w === w && prev.h === h ? prev : { w, h };
      });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Restore / save page position ──────────────────────────────────────────
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

  // ── Load chapter list ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!mangaId) return;
    const load = async () => {
      try {
        setLoadingChapters(true);
        const list = await getChapterList(`/manga/${mangaId}`);
        setChapters(list);
        const decoded = decodeURIComponent(chapterUrl ?? '');
        const idx = list.findIndex(
          (c) => c.url === decoded || encodeURIComponent(c.url) === chapterUrl,
        );
        setCurrentChapterIdx(idx);
      } catch {
        console.warn('Could not load chapter list');
      } finally {
        setLoadingChapters(false);
      }
    };
    load();
  }, [mangaId, chapterUrl]);

  // ── Load images ───────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingImages(true);
        setOcrLoaded(false);
        setOcrDataPages([]);
        setSelectedBlock(null);
        setCurrentPageIndex(0);
        const decodedChapterUrl = decodeURIComponent(chapterUrl ?? '');
        const urls = await getChapterImages(decodedChapterUrl);
        setImages(urls);
        setOcrDataPages(new Array(urls.length).fill(null));
        pageRefs.current = new Array(urls.length).fill(null);

        // Save reading history
        if (user?.id && mangaId) {
          try {
            const currentChapter = chapters.find((c) => 
              c.url === decodedChapterUrl || encodeURIComponent(c.url) === chapterUrl
            );
            await upsertMangaHistory({
              manga_url: `/manga/${mangaId}`,
              current_chapter_url: decodedChapterUrl,
              current_chapter_name: currentChapter?.title || currentChapter?.num || 'Chapter',
            });
          } catch (err) {
            console.warn('Failed to save manga history:', err);
          }
        }
      } catch {
        toast.error('Failed to load chapter images');
        navigate(`/manga/${mangaId}`);
      } finally {
        setLoadingImages(false);
      }
    };
    load();
  }, [mangaId, chapterUrl, navigate, user?.id, chapters]);

  // ── Keyboard nav ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (readMode === 'vertical') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setCurrentPageIndex((p) => clampIdx(p + 1, images.length));
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
      setZoom((z) =>
        Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP))),
      );
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // ── Vertical scroll page tracking ────────────────────────────────────────
  useEffect(() => {
    if (readMode !== 'vertical') return;
    const container = verticalContainerRef.current;
    if (!container) return;
    const handler = () => {
      const scrollY = container.scrollTop;
      let closest = 0,
        minDist = Infinity;
      pageRefs.current.forEach((ref, i) => {
        if (ref) {
          const dist = Math.abs(ref.offsetTop - scrollY);
          if (dist < minDist) {
            minDist = dist;
            closest = i;
          }
        }
      });
      setCurrentPageIndex(closest);
    };
    container.addEventListener('scroll', handler, { passive: true });
    return () => container.removeEventListener('scroll', handler);
  }, [readMode, images.length]);

  // ── Load OCR (non-blocking) ──────────────────────────────────────────────
  const loadOCR = async () => {
    try {
      setLoadingOCR(true);
      const data = await getOCRData(decodeURIComponent(chapterUrl ?? ''));
      setOcrDataPages(data.pages as OCRPageData[]);
      setOcrLoaded(true);
      toast.success('OCR đã tải xong');
    } catch {
      toast.error('Không thể tải OCR');
    } finally {
      setLoadingOCR(false);
    }
  };

  // ── Chapter navigation ────────────────────────────────────────────────────
  const goToChapter = useCallback(
    (chapter: ChapterInfo) => {
      navigate(`/manga/${mangaId}/read/${encodeURIComponent(chapter.url)}`);
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
    const c = clampIdx(idx, images.length);
    setCurrentPageIndex(c);
    if (readMode === 'vertical' && pageRefs.current[c]) {
      pageRefs.current[c]!.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const step = 1;
  const prevPage = () => goTo(currentPageIndex - step);
  const nextPage = () => goTo(currentPageIndex + step);
  const clampZoom = (v: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v));

  const handleSelectBlock = useCallback((pageIdx: number, blockIdx: number) => {
    setSelectedBlock({ pageIdx, blockIdx });
    setPanelOpen(true);
    setPanelTab('text');
  }, []);

  // Look up words when user wants to quick-save selected OCR text
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
    return () => {
      cancelled = true;
    };
  }, [quickAddText]);

  // Selected block data for right drawer
  const selectedBlockData = selectedBlock
    ? ocrDataPages[selectedBlock.pageIdx]?.blocks[selectedBlock.blockIdx] ?? null
    : null;
  const selectedText = selectedBlockData ? selectedBlockData.lines.join('\n') : '';

  // ── Render pages ──────────────────────────────────────────────────────────
  const zoomScale = zoom / 100;

  const singleW = viewerSize.w;
  const singleH = viewerSize.h;

  const renderPages = () => {
    if (readMode === 'vertical') {
      return (
        <div
          ref={verticalContainerRef}
          className="flex-1 overflow-auto"
          style={{ background: BG_COLOR }}
        >
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
                  ref={(el) => {
                    pageRefs.current[i] = el;
                  }}
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
            </div>
          </div>
        </div>
      );
    }

    // Single mode
    return (
      <div
        className="flex-1 overflow-auto flex items-center justify-center"
        style={{ background: BG_COLOR }}
      >
        {images[currentPageIndex] && (
          <div
            style={{
              transform: `scale(${zoomScale})`,
              transformOrigin: 'center center',
              flexShrink: 0,
            }}
          >
            <MangaPage
              src={images[currentPageIndex]}
              pageIndex={currentPageIndex}
              ocrData={ocrDataPages[currentPageIndex]}
              showOCRBoxes={showOCRBoxes}
              boxPadding={boxPadding}
              fitMode="contain"
              containerW={singleW}
              containerH={singleH}
              selectedBlock={selectedBlock}
              onSelectBlock={handleSelectBlock}
            />
          </div>
        )}
      </div>
    );
  };

  // ── Guards ────────────────────────────────────────────────────────────────
  if (loadingImages) return <LoadingScreen isOpen message="Loading chapter..." />;

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground">No images found</p>
        <Button onClick={() => navigate(`/manga/${mangaId}`)}>Go Back</Button>
      </div>
    );
  }

  const currentChapter = currentChapterIdx >= 0 ? chapters[currentChapterIdx] : null;
  const pageLabel = `${currentPageIndex + 1} / ${images.length}`;

  // Edge navigation buttons
  const physicalLeft = () => prevPage();
  const physicalRight = () => nextPage();

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
              {currentChapter
                ? `Ch. ${currentChapter.num} ${currentChapter.title}`
                : `Chapter ${chapterUrl}`}
            </p>
            <p className="text-xs text-muted-foreground">{pageLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {readMode !== 'vertical' && (
            <Select
              value={String(currentPageIndex)}
              onValueChange={(v) => goTo(parseInt(v))}
            >
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

          {ocrLoaded && (
            <Button
              variant={showOCRBoxes ? 'default' : 'outline'}
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setShowOCRBoxes(!showOCRBoxes)}
            >
              {showOCRBoxes ? (
                <Eye className="w-3.5 h-3.5" />
              ) : (
                <EyeOff className="w-3.5 h-3.5" />
              )}
              OCR
            </Button>
          )}

          {loadingOCR && (
            <div className="flex items-center gap-1 px-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              OCR…
            </div>
          )}

          {prevChapter && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title={`Prev: Ch. ${prevChapter.num}`}
              onClick={() => goToChapter(prevChapter)}
            >
              <SkipBack className="w-4 h-4" />
            </Button>
          )}
          {nextChapter && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title={`Next: Ch. ${nextChapter.num}`}
              onClick={() => goToChapter(nextChapter)}
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPanelOpen((v) => !v)}
          >
            {panelOpen ? (
              <PanelRightClose className="w-4 h-4" />
            ) : (
              <PanelRightOpen className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        <div
          ref={setViewerNode}
          className="flex-1 flex overflow-hidden relative min-w-0 min-h-0"
        >
          {renderPages()}

          {readMode !== 'vertical' && (
            <>
              <button
                onClick={physicalLeft}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-20 w-10 flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors rounded-r-lg"
                aria-label="Previous"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={physicalRight}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-20 w-10 flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors rounded-l-lg"
                aria-label="Next"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </>
          )}
        </div>

        {/* Right panel */}
        {panelOpen && (
          <div className="w-72 border-l border-border bg-card flex flex-col flex-shrink-0 min-h-0">
            <div className="flex border-b border-border flex-shrink-0">
              {(['settings', 'chapters', 'text'] as PanelTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setPanelTab(tab)}
                  className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
                    panelTab === tab
                      ? 'border-b-2 border-primary text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab === 'chapters' ? (
                    <span className="flex items-center justify-center gap-1">
                      <List className="w-3 h-3" /> Chapters
                    </span>
                  ) : tab === 'text' ? (
                    <span className="flex items-center justify-center gap-1">
                      <Type className="w-3 h-3" /> Text
                    </span>
                  ) : (
                    'Settings'
                  )}
                </button>
              ))}
            </div>

            {panelTab === 'settings' ? (
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-5">
                  {/* Reading mode */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      Reading Mode
                    </Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(
                        [
                          { value: 'single', label: 'Trang đơn', icon: BookOpen },
                          { value: 'vertical', label: 'Cuộn dọc', icon: AlignJustify },
                        ] as const
                      ).map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          onClick={() => setReadMode(value)}
                          className={`flex flex-col items-center gap-1 p-2 rounded-md border text-xs font-medium transition-colors ${
                            readMode === value
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
                          }`}
                          data-testid={`read-mode-${value}`}
                        >
                          <Icon className="w-4 h-4" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Zoom */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                        Zoom
                      </Label>
                      <span className="text-xs font-mono text-muted-foreground">
                        {zoom}%
                      </span>
                    </div>
                    <Slider
                      min={MIN_ZOOM}
                      max={MAX_ZOOM}
                      step={ZOOM_STEP}
                      value={[zoom]}
                      onValueChange={([v]) => setZoom(v)}
                      className="w-full"
                    />
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 flex-1"
                        onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
                        disabled={zoom <= MIN_ZOOM}
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 flex-1 text-xs"
                        onClick={() => setZoom(100)}
                      >
                        <Maximize2 className="w-3 h-3 mr-1" /> Reset
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 flex-1"
                        onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
                        disabled={zoom >= MAX_ZOOM}
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Ctrl + scroll để zoom</p>
                  </div>

                  <Separator />

                  {/* OCR */}
                  <div className="space-y-3">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      OCR / Text
                    </Label>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ocr-boxes" className="text-sm cursor-pointer">
                        Hiện bounding box
                      </Label>
                      <Switch
                        id="ocr-boxes"
                        checked={showOCRBoxes}
                        onCheckedChange={setShowOCRBoxes}
                        disabled={!ocrLoaded}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs cursor-pointer">
                          Padding box
                        </Label>
                        <span className="text-xs font-mono text-muted-foreground">
                          {boxPadding}px
                        </span>
                      </div>
                      <Slider
                        min={MIN_PADDING}
                        max={MAX_PADDING}
                        step={1}
                        value={[boxPadding]}
                        onValueChange={([v]) => setBoxPadding(v)}
                        className="w-full"
                      />
                    </div>

                    <Button
                      onClick={loadOCR}
                      disabled={loadingOCR || ocrLoaded}
                      size="sm"
                      className="w-full h-8 text-xs gap-1.5"
                    >
                      {loadingOCR ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ScanText className="w-3.5 h-3.5" />
                      )}
                      {ocrLoaded
                        ? 'OCR đã tải'
                        : loadingOCR
                        ? 'Đang tải OCR (bạn có thể đọc tiếp)…'
                        : 'Tải OCR'}
                    </Button>

                    {ocrLoaded && (
                      <p className="text-xs text-muted-foreground leading-snug">
                        Chạm vào bounding box để mở trong tab Text. Nhấn nút copy ở góc để sao chép toàn bộ.
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Jump to page */}
                  {readMode !== 'vertical' && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                        Jump to Page
                      </Label>
                      <Select
                        value={String(currentPageIndex)}
                        onValueChange={(v) => goTo(parseInt(v))}
                      >
                        <SelectTrigger className="text-xs h-8">
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
                    </div>
                  )}

                  <Separator />

                  {/* Chapter nav shortcuts */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      Chapter
                    </Label>
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs gap-1"
                        disabled={!prevChapter}
                        onClick={() => prevChapter && goToChapter(prevChapter)}
                      >
                        <SkipBack className="w-3.5 h-3.5" /> Prev
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs gap-1"
                        disabled={!nextChapter}
                        onClick={() => nextChapter && goToChapter(nextChapter)}
                      >
                        Next <SkipForward className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            ) : panelTab === 'chapters' ? (
              <ScrollArea className="flex-1">
                {loadingChapters ? (
                  <div className="p-4 text-xs text-muted-foreground">Loading chapters…</div>
                ) : chapters.length === 0 ? (
                  <div className="p-4 text-xs text-muted-foreground">No chapters found.</div>
                ) : (
                  <div className="py-1">
                    {chapters.map((ch, i) => {
                      const isActive = i === currentChapterIdx;
                      return (
                        <button
                          key={ch.url}
                          onClick={() => goToChapter(ch)}
                          className={`w-full text-left px-4 py-2.5 transition-colors ${
                            isActive
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-foreground hover:bg-muted/50'
                          }`}
                        >
                          <p className="text-xs font-semibold">Ch. {ch.num}</p>
                          {ch.title && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {ch.title}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            ) : (
              // ── Text tab ──
              <div className="flex-1 flex flex-col min-h-0">
                {selectedBlockData ? (
                  <>
                    <div className="p-3 border-b border-border bg-muted/30 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold">
                          Page {selectedBlock!.pageIdx + 1} · Block{' '}
                          {selectedBlock!.blockIdx + 1}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {selectedBlockData.vertical ? 'Dọc' : 'Ngang'} ·{' '}
                          {selectedBlockData.lines.length} dòng
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => copyToClipboard(selectedText)}
                      >
                        <Copy className="w-3.5 h-3.5" /> Copy
                      </Button>
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="p-4 space-y-3">
                        <textarea
                          readOnly
                          value={selectedText}
                          className="w-full min-h-[180px] p-3 text-sm leading-relaxed bg-background border rounded-md font-japanese resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 select-text"
                          style={{
                            fontFamily:
                              '"Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif',
                          }}
                        />
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            className="w-full gap-1.5"
                            onClick={() => setTokenizeOpen(true)}
                            data-testid="manga-tokenize-text-btn"
                          >
                            <Wand2 className="w-3.5 h-3.5" /> Phân tích từ
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full gap-1.5"
                            onClick={() => setQuickAddText(selectedText)}
                            data-testid="manga-add-to-deck-btn"
                          >
                            <BookmarkPlus className="w-3.5 h-3.5" /> Lưu vào bộ
                          </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          Bạn có thể chọn một phần hoặc toàn bộ text phía trên rồi
                          sao chép.
                        </p>
                      </div>
                    </ScrollArea>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-2">
                    <Type className="w-8 h-8 text-muted-foreground/50" />
                    <p className="text-sm font-medium text-muted-foreground">
                      Chưa chọn bounding box
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ocrLoaded
                        ? 'Chạm vào một bounding box trên trang để hiển thị text ở đây.'
                        : 'Tải OCR trước, sau đó chạm vào bounding box.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <SentenceTokenizeDialog
        open={tokenizeOpen}
        onOpenChange={setTokenizeOpen}
        text={selectedText}
      />
      <AddToDeckDialog
        open={!!quickAddText && quickAddWords.length > 0}
        onOpenChange={(o) => {
          if (!o) {
            setQuickAddText(null);
            setQuickAddWords([]);
          }
        }}
        words={quickAddWords}
        title={`Lưu từ tìm được (${quickAddWords.length})`}
      />
    </div>
  );
}

function clampIdx(i: number, len: number) {
  if (len === 0) return 0;
  return Math.max(0, Math.min(i, len - 1));
}
