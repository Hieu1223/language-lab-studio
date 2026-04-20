import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  BookOpen,
  Columns2,
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

type ReadMode = 'single' | 'double' | 'vertical';
type PanelTab = 'settings' | 'chapters';

const STORAGE_KEY_PREFIX = 'manga-reader-';
const MIN_ZOOM = 50;
const MAX_ZOOM = 300;
const ZOOM_STEP = 10;
const BG_COLOR = '#1a1b26';

// ─── OCR Overlay ──────────────────────────────────────────────────────────────
// imgW / imgH must be the element's offsetWidth/offsetHeight (layout pixels,
// unaffected by scroll position) — NOT getBoundingClientRect() which shifts
// when the page is scrolled.

interface OCROverlayProps {
  ocrData: OCRPageData;
  imgW: number;
  imgH: number;
  showBoxes: boolean;
}

function OCROverlay({ ocrData, imgW, imgH, showBoxes }: OCROverlayProps) {
  const scaleX = imgW / ocrData.img_width;
  const scaleY = imgH / ocrData.img_height;

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ userSelect: 'text', pointerEvents: 'none' }}
    >
      {ocrData.blocks.map((block, idx) => {
        const [x1, y1, x2, y2] = block.box;
        const left   = x1 * scaleX;
        const top    = y1 * scaleY;
        const width  = (x2 - x1) * scaleX;
        const height = (y2 - y1) * scaleY;
        const scaledFont = Math.max(8, block.font_size * Math.min(scaleX, scaleY));

        return (
          <div
            key={idx}
            className={showBoxes
              ? 'absolute border-2 border-blue-400/70 bg-blue-400/10 rounded-sm hover:border-blue-400 hover:bg-blue-400/20'
              : 'absolute'}
            style={{ left, top, width, height, pointerEvents: 'auto' }}
          >
            {block.vertical ? (
              // Each entry in block.lines = one vertical column (top→bottom).
              // Columns read right→left, so flex-row-reverse puts lines[0] rightmost.
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'row-reverse',
                overflow: 'hidden', cursor: 'text',
                userSelect: 'text', WebkitUserSelect: 'text',
              }}>
                {block.lines.map((line, li) => (
                  <div key={li} style={{
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
                  }}>{line}</div>
                ))}
              </div>
            ) : (
              // Horizontal block: lines stack top→bottom
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden', cursor: 'text',
                userSelect: 'text', WebkitUserSelect: 'text',
              }}>
                {block.lines.map((line, li) => (
                  <div key={li} style={{
                    flex: '1 1 0',
                    fontSize: scaledFont,
                    lineHeight: 1,
                    color: 'transparent',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    userSelect: 'text',
                    WebkitUserSelect: 'text',
                  }}>{line}</div>
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
// In single/double mode the image is inside a fixed-size flex container:
//   - The container fills the viewer (width + height).
//   - The <img> uses object-fit:contain so it letterboxes within that space.
//   - We measure offsetWidth/offsetHeight of the img element (its rendered
//     intrinsic size after object-fit) via a ResizeObserver to get the actual
//     pixel dimensions the image occupies — needed for OCR scaling.
//     BUT object-fit:contain makes getBoundingClientRect equal the container,
//     so we must compute the rendered image rect ourselves from the natural
//     aspect ratio.
//
// In vertical/scroll mode we just render the image at full width (no height
// constraint) and measure offsetWidth / offsetHeight normally.

interface MangaPageProps {
  src: string;
  pageIndex: number;
  ocrData: OCRPageData | null;
  showOCRBoxes: boolean;
  /** 'contain' = fit inside a fixed box (single/double). 'width' = fill container width (vertical scroll). */
  fitMode: 'contain' | 'width';
  /** Only used when fitMode='contain'. Container dimensions in px. */
  containerW?: number;
  containerH?: number;
}

function MangaPage({
  src, pageIndex, ocrData, showOCRBoxes,
  fitMode, containerW = 0, containerH = 0,
}: MangaPageProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef  = useRef<HTMLImageElement>(null);
  // Rendered pixel size of the actual image content (excluding letterbox bars)
  const [renderedSize, setRenderedSize] = useState({ w: 0, h: 0, left: 0, top: 0 });

  const computeRendered = useCallback(() => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return;
    if (fitMode === 'width') {
      // Image fills wrapper width, height is auto
      setRenderedSize({ w: img.offsetWidth, h: img.offsetHeight, left: 0, top: 0 });
    } else {
      // object-fit:contain inside containerW × containerH
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
      const top  = (containerH - rh) / 2;
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
    return () => { img.removeEventListener('load', computeRendered); ro.disconnect(); };
  }, [src, computeRendered]);

  // Re-compute when container dimensions change (single/double mode)
  useEffect(() => { computeRendered(); }, [computeRendered, containerW, containerH]);

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
          <div style={{
            position: 'absolute',
            left: renderedSize.left,
            top: renderedSize.top,
            width: renderedSize.w,
            height: renderedSize.h,
          }}>
            <OCROverlay
              ocrData={ocrData}
              imgW={renderedSize.w}
              imgH={renderedSize.h}
              showBoxes={showOCRBoxes}
            />
          </div>
        )}
      </div>
    );
  }

  // width mode (vertical scroll)
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
        />
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MangaReaderPage() {
  const { mangaId, chapterUrl } = useParams<{ mangaId: string; chapterUrl: string }>();
  const navigate = useNavigate();

  const [images, setImages]             = useState<string[]>([]);
  const [ocrDataPages, setOcrDataPages] = useState<(OCRPageData | null)[]>([]);
  const [ocrLoaded, setOcrLoaded]       = useState(false);
  const [showOCRBoxes, setShowOCRBoxes] = useState(true);
  const [loadingImages, setLoadingImages] = useState(true);
  const [loadingOCR, setLoadingOCR]     = useState(false);

  const [chapters, setChapters]         = useState<ChapterInfo[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [currentChapterIdx, setCurrentChapterIdx] = useState(-1);

  const [readMode, setReadMode]         = useState<ReadMode>('single');
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [panelOpen, setPanelOpen]       = useState(true);
  const [panelTab, setPanelTab]         = useState<PanelTab>('settings');
  const [zoom, setZoom]                 = useState(100);

  // Viewer element — measured to size the contain-mode images
  const viewerRef    = useRef<HTMLDivElement>(null);
  const [viewerSize, setViewerSize] = useState({ w: 0, h: 0 });

  const verticalContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs             = useRef<(HTMLDivElement | null)[]>([]);

  const storageKey = `${STORAGE_KEY_PREFIX}${mangaId}-${chapterUrl}`;

  // ── Measure viewer ────────────────────────────────────────────────────────
  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;
    const update = () => setViewerSize({ w: el.clientWidth, h: el.clientHeight });
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
        // mangaId is the encoded manga_url
        const list = await getChapterList(`/manga/${mangaId}`);
        setChapters(list);
        // Find current chapter index
        const decoded = decodeURIComponent(chapterUrl ?? '');
        const idx = list.findIndex((c) => c.url === decoded || encodeURIComponent(c.url) === chapterUrl);
        setCurrentChapterIdx(idx);
      } catch {
        // Non-fatal — chapter nav won't work but reading still works
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
        setCurrentPageIndex(0);
        const urls = await getChapterImages(decodeURIComponent(chapterUrl ?? ''));
        setImages(urls);
        setOcrDataPages(new Array(urls.length).fill(null));
        pageRefs.current = new Array(urls.length).fill(null);
      } catch {
        toast.error('Failed to load chapter images');
        navigate(`/manga/${mangaId}`);
      } finally {
        setLoadingImages(false);
      }
    };
    load();
  }, [mangaId, chapterUrl, navigate]);

  // ── Keyboard nav ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (readMode === 'vertical') return;
    const step = readMode === 'double' ? 2 : 1;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setCurrentPageIndex((p) => Math.min(p + step, images.length - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setCurrentPageIndex((p) => Math.max(p - step, 0));
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

  // ── Vertical scroll page tracking ────────────────────────────────────────
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
    try {
      setLoadingOCR(true);
      const data = await getOCRData(decodeURIComponent(chapterUrl ?? ''));
      setOcrDataPages(data.pages as OCRPageData[]);
      setOcrLoaded(true);
    } catch {
      toast.error('Failed to load OCR data');
    } finally {
      setLoadingOCR(false);
    }
  };

  // ── Chapter navigation ────────────────────────────────────────────────────
  const goToChapter = useCallback((chapter: ChapterInfo) => {
    navigate(`/manga/${mangaId}/read/${encodeURIComponent(chapter.url)}`);
  }, [mangaId, navigate]);

  const prevChapter = currentChapterIdx > 0 ? chapters[currentChapterIdx - 1] : null;
  const nextChapter = currentChapterIdx >= 0 && currentChapterIdx < chapters.length - 1
    ? chapters[currentChapterIdx + 1]
    : null;

  // ── Page navigation ───────────────────────────────────────────────────────
  const goTo = (idx: number) => {
    const c = Math.max(0, Math.min(idx, images.length - 1));
    setCurrentPageIndex(c);
    if (readMode === 'vertical' && pageRefs.current[c]) {
      pageRefs.current[c]!.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const prevPage = () => goTo(currentPageIndex - (readMode === 'double' ? 2 : 1));
  const nextPage = () => goTo(currentPageIndex + (readMode === 'double' ? 2 : 1));
  const clampZoom = (v: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v));

  // ── Render pages ──────────────────────────────────────────────────────────
  //
  // Zoom strategy:
  //   - single/double: images are sized to the viewer via contain mode.
  //     Zoom scales the *viewer area* via transform so the image grows
  //     beyond the container and becomes scrollable.
  //   - vertical: zoom scales the scroll content the same way.
  //
  // At 100% zoom in single mode, the image always fits exactly inside the
  // viewer (both width AND height respected via object-fit:contain).

  const zoomScale = zoom / 100;

  // For single/double contain mode, each page gets half the viewer width
  const singleW = viewerSize.w;
  const singleH = viewerSize.h;
  const doubleW = Math.floor(viewerSize.w / 2);
  const doubleH = viewerSize.h;

  const renderPages = () => {
    if (readMode === 'vertical') {
      return (
        <div
          ref={verticalContainerRef}
          className="flex-1 overflow-auto"
          style={{ background: BG_COLOR }}
        >
          {/* Zoom wrapper — scales from top-center so horizontal scroll appears symmetrically */}
          <div style={{
            transformOrigin: 'top center',
            transform: `scale(${zoomScale})`,
            // Expand the layout height so the scrollbar reflects zoomed size
            ...(zoom !== 100 && {
              height: `${100 / zoomScale}%`,
              width: `${100 / zoomScale}%`,
              marginLeft: `${((zoomScale - 1) / 2) * 100}%`,
            }),
          }}>
            <div className="flex flex-col items-center gap-3 py-4 px-2">
              {images.map((src, i) => (
                <div
                  key={i}
                  ref={(el) => { pageRefs.current[i] = el; }}
                  style={{ width: '100%', maxWidth: 800 }}
                >
                  <MangaPage
                    src={src}
                    pageIndex={i}
                    ocrData={ocrDataPages[i]}
                    showOCRBoxes={showOCRBoxes}
                    fitMode="width"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (readMode === 'double') {
      const li = currentPageIndex;
      const ri = currentPageIndex + 1;
      // Zoom: scale up from center; overflow→scroll
      return (
        <div
          className="flex-1 overflow-auto flex items-center justify-center"
          style={{ background: BG_COLOR }}
        >
          <div style={{
            transform: `scale(${zoomScale})`,
            transformOrigin: 'center center',
            display: 'flex',
            gap: 2,
            flexShrink: 0,
          }}>
            {images[li] && (
              <MangaPage
                src={images[li]} pageIndex={li}
                ocrData={ocrDataPages[li]} showOCRBoxes={showOCRBoxes}
                fitMode="contain"
                containerW={doubleW} containerH={doubleH}
              />
            )}
            {images[ri] && (
              <MangaPage
                src={images[ri]} pageIndex={ri}
                ocrData={ocrDataPages[ri]} showOCRBoxes={showOCRBoxes}
                fitMode="contain"
                containerW={doubleW} containerH={doubleH}
              />
            )}
          </div>
        </div>
      );
    }

    // Single — at 100% zoom the image letterboxes to exactly fill the viewer
    return (
      <div
        className="flex-1 overflow-auto flex items-center justify-center"
        style={{ background: BG_COLOR }}
      >
        {images[currentPageIndex] && (
          <div style={{
            transform: `scale(${zoomScale})`,
            transformOrigin: 'center center',
            flexShrink: 0,
          }}>
            <MangaPage
              src={images[currentPageIndex]}
              pageIndex={currentPageIndex}
              ocrData={ocrDataPages[currentPageIndex]}
              showOCRBoxes={showOCRBoxes}
              fitMode="contain"
              containerW={singleW}
              containerH={singleH}
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
  const pageLabel = readMode === 'double'
    ? `${currentPageIndex + 1}–${Math.min(currentPageIndex + 2, images.length)} / ${images.length}`
    : `${currentPageIndex + 1} / ${images.length}`;

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <LoadingScreen isOpen={loadingOCR} message="Processing OCR..." />

      {/* ── Header ── */}
      <div className="border-b border-border px-3 py-2 flex items-center justify-between flex-shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0"
            onClick={() => navigate(`/manga/${mangaId}`)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">
              {currentChapter ? `Ch. ${currentChapter.num} ${currentChapter.title}` : `Chapter ${chapterUrl}`}
            </p>
            <p className="text-xs text-muted-foreground">{pageLabel}</p>
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
                  <SelectItem key={i} value={String(i)} className="text-xs">Page {i + 1}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {ocrLoaded && (
            <Button variant={showOCRBoxes ? 'default' : 'outline'} size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setShowOCRBoxes((v) => !v)}>
              {showOCRBoxes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              OCR
            </Button>
          )}

          {prevChapter && (
            <Button variant="ghost" size="icon" className="h-8 w-8" title={`Prev: Ch. ${prevChapter.num}`}
              onClick={() => goToChapter(prevChapter)}>
              <SkipBack className="w-4 h-4" />
            </Button>
          )}
          {nextChapter && (
            <Button variant="ghost" size="icon" className="h-8 w-8" title={`Next: Ch. ${nextChapter.num}`}
              onClick={() => goToChapter(nextChapter)}>
              <SkipForward className="w-4 h-4" />
            </Button>
          )}

          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => setPanelOpen((v) => !v)}>
            {panelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Viewer */}
        <div ref={viewerRef} className="flex-1 flex overflow-hidden relative min-w-0 min-h-0">
          {renderPages()}

          {/* Edge nav buttons */}
          {readMode !== 'vertical' && (
            <>
              <button onClick={prevPage} disabled={currentPageIndex === 0}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-20 w-10 flex items-center justify-center bg-black/30 hover:bg-black/50 disabled:opacity-20 transition-colors rounded-r-lg">
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <button onClick={nextPage} disabled={currentPageIndex >= images.length - 1}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-20 w-10 flex items-center justify-center bg-black/30 hover:bg-black/50 disabled:opacity-20 transition-colors rounded-l-lg">
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </>
          )}
        </div>

        {/* ── Right panel ── */}
        {panelOpen && (
          <div className="w-60 border-l border-border bg-card flex flex-col flex-shrink-0 min-h-0">
            {/* Panel tab bar */}
            <div className="flex border-b border-border flex-shrink-0">
              {(['settings', 'chapters'] as PanelTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setPanelTab(tab)}
                  className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
                    panelTab === tab
                      ? 'border-b-2 border-primary text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab === 'chapters' ? <span className="flex items-center justify-center gap-1"><List className="w-3 h-3" /> Chapters</span> : 'Settings'}
                </button>
              ))}
            </div>

            {panelTab === 'settings' ? (
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-5">

                  {/* Reading mode */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Reading Mode</Label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {([
                        { value: 'single',   label: 'Single',  icon: BookOpen     },
                        { value: 'double',   label: 'Double',  icon: Columns2     },
                        { value: 'vertical', label: 'Scroll',  icon: AlignJustify },
                      ] as const).map(({ value, label, icon: Icon }) => (
                        <button key={value} onClick={() => setReadMode(value)}
                          className={`flex flex-col items-center gap-1 p-2 rounded-md border text-xs font-medium transition-colors ${
                            readMode === value
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
                          }`}>
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
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Zoom</Label>
                      <span className="text-xs font-mono text-muted-foreground">{zoom}%</span>
                    </div>
                    <Slider min={MIN_ZOOM} max={MAX_ZOOM} step={ZOOM_STEP}
                      value={[zoom]} onValueChange={([v]) => setZoom(v)} className="w-full" />
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" size="icon" className="h-7 w-7 flex-1"
                        onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))} disabled={zoom <= MIN_ZOOM}>
                        <ZoomOut className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 flex-1 text-xs"
                        onClick={() => setZoom(100)}>
                        <Maximize2 className="w-3 h-3 mr-1" /> Reset
                      </Button>
                      <Button variant="outline" size="icon" className="h-7 w-7 flex-1"
                        onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))} disabled={zoom >= MAX_ZOOM}>
                        <ZoomIn className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Ctrl + scroll to zoom</p>
                  </div>

                  <Separator />

                  {/* OCR */}
                  <div className="space-y-3">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">OCR / Text</Label>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ocr-boxes" className="text-sm cursor-pointer">Show boxes</Label>
                      <Switch id="ocr-boxes" checked={showOCRBoxes} onCheckedChange={setShowOCRBoxes} disabled={!ocrLoaded} />
                    </div>
                    <Button onClick={loadOCR} disabled={loadingOCR || ocrLoaded}
                      size="sm" className="w-full h-8 text-xs gap-1.5">
                      <ScanText className="w-3.5 h-3.5" />
                      {ocrLoaded ? 'OCR Loaded' : 'Load OCR'}
                    </Button>
                    {ocrLoaded && (
                      <p className="text-xs text-muted-foreground leading-snug">
                        Select text directly on the page to copy it.
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Jump to page */}
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

                  {/* Chapter nav shortcuts */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Chapter</Label>
                    <div className="flex gap-1.5">
                      <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1"
                        disabled={!prevChapter} onClick={() => prevChapter && goToChapter(prevChapter)}>
                        <SkipBack className="w-3.5 h-3.5" /> Prev
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1"
                        disabled={!nextChapter} onClick={() => nextChapter && goToChapter(nextChapter)}>
                        Next <SkipForward className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                </div>
              </ScrollArea>
            ) : (
              /* ── Chapters tab ── */
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
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{ch.title}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            )}
          </div>
        )}
      </div>
    </div>
  );
}