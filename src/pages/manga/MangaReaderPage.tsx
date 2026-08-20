import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
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
  ChevronDown,
  Share2,
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
import { BlockTokenResult } from '@/components/manga/BlockTokenResult';
import { DependencyArcsList } from '@/components/dictionary/DependencyArcs';
import { blockTrees, treesToTokens } from '@/lib/manga-analysis';
import { ChapterEndCard, chapterLabel } from '@/components/manga/ChapterEndCard';
import { DictionaryRightPanel } from '@/components/manga/DictionaryRightPanel';
import { MangaPage } from '@/components/manga/MangaPage';
import {
  BG_COLOR,
  DEFAULT_SETTINGS,
  MAX_PADDING,
  MAX_ZOOM,
  MIN_PADDING,
  MIN_ZOOM,
  SETTINGS_KEY,
  ZOOM_STEP,
  type PanelTab,
  type ReaderSettings,
  type ReadMode,
  type SelectedBlock,
} from '@/components/manga/reader-types';
import { tokenize, type Token } from '@/lib/api/dictionary';
import {
  getChapterRead,
  getOCRResult,
  upsertMangaHistory,
  type ChapterPreview,
  type OCRPage,
} from '@/lib/api/manga';
import { ApiError } from '@/lib/api/client';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { copyToClipboard } from '@/lib/clipboard';
import { getMangaSettings } from '@/lib/settings-storage';

// ──── Reader-local helpers ────

function loadSettings(): ReaderSettings {
  // Pull defaults from global app settings, then overlay reader-specific local saved.
  let base: ReaderSettings = { ...DEFAULT_SETTINGS };
  try {
    const g = getMangaSettings();
    base = {
      ...base,
      autoOpenPanelOnBlock: g.autoOpenPanelOnBlock,
      showOCRBoxes: g.showOCRBoxes,
      zoom: g.zoom,
    };
  } catch { /* ignore */ }
  try {
    const s = localStorage.getItem(SETTINGS_KEY);
    if (s) return { ...base, ...JSON.parse(s) };
  } catch { /* ignore */ }
  return base;
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
  const ocrPageCounterRef = useRef(0);
  /** True once we know the chapter already has a stored OCR result. */
  const [ocrAvailable, setOcrAvailable] = useState(false);
  const fetchedOcrPagesRef = useRef<Set<number>>(new Set());
  const activeOcrChapterRef = useRef<string | null>(null);

  // ── Settings ─────────────────────────────────────────────────────────────
  const [settings, setSettings] = useState<ReaderSettings>(loadSettings);
  const { readMode, showOCRBoxes, boxPadding, zoom, autoOpenPanelOnBlock } = settings;

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
  // Blocks whose dependency-arc diagram is currently visible (key "page-block")
  const [arcBlocks, setArcBlocks] = useState<Set<string>>(new Set());

  // ── OCR block list state ──────────────────────────────────────────────────
  // expandedBlock: "pageIdx-blockIdx" of the currently open accordion item
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
  // cached tokenization results per block key
  const [blockTokens, setBlockTokens] = useState<Map<string, Token[]>>(new Map());
  // blocks currently being tokenized
  const [blockTokenizing, setBlockTokenizing] = useState<Set<string>>(new Set());
  // refs for scrolling list items into view when canvas block is clicked
  const blockListRef = useRef<HTMLDivElement>(null);
  const blockItemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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
        activeOcrChapterRef.current = chapterId;
        ocrPageCounterRef.current = 0;
        setOcrLoaded(false);
        setOcrAvailable(false);
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
        fetchedOcrPagesRef.current = new Set();
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

        // Probe whether OCR already exists — only one page is fetched, the
        // reader then pulls the OCR of whatever page the user is on.
        try {
          const existing = await getOCRResult(chapterId, { offset: 0, limit: 1 });
          const first = existing.ocr_data.pages[0] ?? null;
          setOcrDataPages((prev) => {
            const next = prev.length ? prev.slice() : new Array(data.pages.length).fill(null);
            next[0] = first;
            return next;
          });
          fetchedOcrPagesRef.current.add(0);
          setOcrPagesReceived(existing.total_pages);
          setOcrAvailable(true);
          setOcrLoaded(true);
        } catch {
          // 404 = not yet OCR'd, that's fine — user can trigger manually
          setOcrAvailable(false);
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
      const existing = await getOCRResult(chapterId, { offset: currentPageIndex, limit: 1 });
      const page = existing.ocr_data.pages[0] ?? null;
      setOcrDataPages((prev) => {
        const next = prev.length >= images.length ? prev.slice() : new Array(images.length).fill(null);
        next[currentPageIndex] = page;
        return next;
      });
      fetchedOcrPagesRef.current.add(currentPageIndex);
      setOcrPagesReceived(existing.total_pages);
      setOcrAvailable(true);
      setOcrLoaded(true);
      toast.success('OCR đã được tải từ cache');
      return;
    } catch (err) {
      // 404 = not yet OCR'd, proceed to stream
      if (err instanceof ApiError && err.status !== 404) {
        toast.error('Không thể kiểm tra OCR');
        return;
      }
    }

    // Start streaming OCR
    setLoadingOCR(true);
    setOcrLoaded(false);
    setOcrPagesReceived(0);
    ocrPageCounterRef.current = 0;
    fetchedOcrPagesRef.current = new Set();
    setOcrDataPages(new Array(images.length).fill(null));

    ocrStreamRef.current = streamOCR(
      chapterId,
      {
        onPage: (page) => {
          const idx = ocrPageCounterRef.current;
          ocrPageCounterRef.current += 1;
          setOcrDataPages((prev) => {
            const next = prev.length >= images.length ? prev.slice() : new Array(images.length).fill(null);
            if (idx < next.length) next[idx] = page;
            return next;
          });
          fetchedOcrPagesRef.current.add(idx);
          setOcrPagesReceived((c) => c + 1);
        },
        onDone: () => {
          setOcrLoaded(true);
          setOcrAvailable(true);
          setLoadingOCR(false);
          ocrStreamRef.current = null;
          toast.success('OCR đã tải xong');
        },
        onError: (err) => {
          // 409 = race: another client triggered OCR, try fetching the result
          if (err.message.includes('409')) {
            getOCRResult(chapterId!, { offset: currentPageIndex, limit: 1 }).then((existing) => {
              const page = existing.ocr_data.pages[0] ?? null;
              setOcrDataPages((prev) => {
                const next = prev.length >= images.length ? prev.slice() : new Array(images.length).fill(null);
                next[currentPageIndex] = page;
                return next;
              });
              fetchedOcrPagesRef.current.add(currentPageIndex);
              setOcrPagesReceived(existing.total_pages);
              setOcrAvailable(true);
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
      },
    );
  };

  // ── Fetch one OCR page without duplicating requests ───────────────────────
  const fetchOcrPage = useCallback(
    async (idx: number) => {
      if (!chapterId || idx < 0 || idx >= images.length) return;
      if (fetchedOcrPagesRef.current.has(idx)) return;
      fetchedOcrPagesRef.current.add(idx);
      const requestedChapterId = chapterId;
      try {
        const res = await getOCRResult(requestedChapterId, { offset: idx, limit: 1 });
        if (activeOcrChapterRef.current !== requestedChapterId) return;
        const page = res.ocr_data.pages[0] ?? null;
        setOcrDataPages((prev) => {
          const next = prev.length >= images.length ? prev.slice() : new Array(images.length).fill(null);
          next[idx] = page;
          return next;
        });
      } catch {
        if (activeOcrChapterRef.current === requestedChapterId) {
          fetchedOcrPagesRef.current.delete(idx);
        }
      }
    },
    [chapterId, images.length],
  );

  // In scrolling mode, fetch OCR when a page enters (or nears) the viewport.
  // The current-page tracker is intentionally kept separate from data loading:
  // it can lag behind a fast scroll by a frame or two.
  useEffect(() => {
    if (readMode !== 'vertical' || !chapterId || !ocrAvailable || loadingOCR) return;
    const container = verticalContainerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const idx = Number((entry.target as HTMLElement).dataset.pageIndex);
          if (Number.isInteger(idx)) void fetchOcrPage(idx);
        });
      },
      { root: container, rootMargin: '300px 0px', threshold: 0.01 },
    );
    pageRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });
    return () => observer.disconnect();
  }, [readMode, chapterId, ocrAvailable, loadingOCR, images.length, fetchOcrPage]);

  // Keep single-page mode loading the page selected by the controls.
  useEffect(() => {
    if (readMode === 'vertical' || !chapterId || !ocrAvailable || loadingOCR) return;
    void fetchOcrPage(currentPageIndex);
  }, [readMode, chapterId, ocrAvailable, loadingOCR, currentPageIndex, fetchOcrPage]);

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

  const gestureStartRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const handleGestureStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (readMode !== 'single' || (event.pointerType !== 'touch' && event.pointerType !== 'pen')) return;
    gestureStartRef.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handleGestureEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = gestureStartRef.current;
    gestureStartRef.current = null;
    if (!start || readMode !== 'single' || (event.pointerType !== 'touch' && event.pointerType !== 'pen')) return;
    if (event.currentTarget.hasPointerCapture(start.pointerId)) {
      event.currentTarget.releasePointerCapture(start.pointerId);
    }

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) <= Math.abs(dy) * 1.2) return;
    if (dx < 0) nextPage();
    else prevPage();
  };
  const clampZoom = (v: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v));

  const handleSelectBlock = useCallback((pageIdx: number, blockIdx: number) => {
    const key = `${pageIdx}-${blockIdx}`;
    const block = ocrDataPages[pageIdx]?.blocks[blockIdx];
    const text = block?.lines.join('\n') ?? '';
    setSelectedBlock({ pageIdx, blockIdx });
    setExpandedBlock(key);
    const hasEmbedded = blockTrees(block).length > 0;
    if (!hasEmbedded && text.trim() && !blockTokens.has(key) && !blockTokenizing.has(key)) {
      setBlockTokenizing((prev) => new Set(prev).add(key));
      void tokenize(text)
        .then((result) => setBlockTokens((prev) => new Map(prev).set(key, result.tokens)))
        .catch(() => toast.error('Phân tích thất bại'))
        .finally(() => setBlockTokenizing((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        }));
    }
    if (autoOpenPanelOnBlock) {
      setPanelOpen(true);
      setPanelTab('text');
    }
    requestAnimationFrame(() => {
      const el = blockItemRefs.current.get(key);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, [autoOpenPanelOnBlock, blockTokenizing, blockTokens, ocrDataPages]);

  // ── Block tokenize ───────────────────────────────────────────────────────
  const tokenizeBlock = async (key: string, text: string) => {
    if (blockTokenizing.has(key)) return;
    setBlockTokenizing((prev) => { const s = new Set(prev); s.add(key); return s; });
    try {
      const res = await tokenize(text);
      setBlockTokens((prev) => new Map(prev).set(key, res.tokens));
    } catch {
      toast.error('Phân tích thất bại');
    } finally {
      setBlockTokenizing((prev) => { const s = new Set(prev); s.delete(key); return s; });
    }
  };

  // Older OCR payloads have no embedded GiNZA analysis. For those, tokenize
  // every block of the page being read automatically — no button to press.
  const tokenizeBlockRef = useRef(tokenizeBlock);
  tokenizeBlockRef.current = tokenizeBlock;
  useEffect(() => {
    const page = ocrDataPages[currentPageIndex];
    if (!page) return;
    let cancelled = false;
    (async () => {
      for (const [blockIdx, block] of page.blocks.entries()) {
        if (cancelled) return;
        if (blockTrees(block).length > 0) continue;
        const key = `${currentPageIndex}-${blockIdx}`;
        if (blockTokens.has(key) || blockTokenizing.has(key)) continue;
        const text = block.lines.join('\n');
        if (!text.trim()) continue;
        await tokenizeBlockRef.current(key, text);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPageIndex, ocrDataPages[currentPageIndex]]);

  const isTokenizingAny = blockTokenizing.size > 0;

  const currentOcrPage = ocrDataPages[currentPageIndex] ?? null;
  const zoomScale = zoom / 100;

  // ── End-of-chapter card ───────────────────────────────────────────────────
  const endCardNode = (
    <ChapterEndCard
      width={viewerSize.w || '100%'}
      height={viewerSize.h || '100%'}
      currentChapter={currentChapter}
      prevChapter={prevChapter}
      nextChapter={nextChapter}
      onGoToChapter={goToChapter}
      onBackToManga={() => navigate(`/manga/${mangaId}`)}
      onBackToLastPage={() => goTo(images.length - 1)}
    />
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
                  data-page-index={i}
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
                {endCardNode}
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
          endCardNode
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

      {/* Body — desktop: panel pushes layout. Mobile: panel overlays. */}
      <div className="flex-1 overflow-hidden min-h-0 flex relative">
        {/* Viewer fills remaining space */}
        <div className="flex-1 min-w-0 min-h-0 relative overflow-hidden">
          <div
            ref={setViewerNode}
            className="absolute inset-0 flex overflow-hidden"
            style={{ touchAction: readMode === 'single' ? 'pan-y' : undefined }}
            onPointerDown={handleGestureStart}
            onPointerUp={handleGestureEnd}
            onPointerCancel={() => { gestureStartRef.current = null; }}
          >
            {renderPages()}
          </div>
        </div>

        {/* Right panel */}
        {panelOpen && (
          <>
            {/* Mobile-only backdrop */}
            <div
              className="absolute inset-0 z-20 bg-black/40 sm:hidden"
              onClick={() => setPanelOpen(false)}
            />
            {/* Drawer:
                - Mobile: absolute floating over viewer
                - Desktop (sm+): relative, part of flex flow → pushes viewer */}
            <div className="absolute sm:relative top-0 right-0 bottom-0 sm:top-auto sm:right-auto sm:bottom-auto z-30 sm:z-auto w-72 sm:w-80 max-w-[85vw] sm:max-w-none flex-shrink-0 border-l border-border bg-card flex flex-col shadow-2xl sm:shadow-none h-full">
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

                    <div className="flex items-center justify-between pt-1">
                      <Label htmlFor="auto-open-panel" className="text-sm cursor-pointer pr-2">
                        Tự mở panel khi bấm OCR
                      </Label>
                      <Switch
                        id="auto-open-panel"
                        checked={autoOpenPanelOnBlock}
                        onCheckedChange={(v) => updateSettings({ autoOpenPanelOnBlock: v })}
                      />
                    </div>
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

            {/* Text tab — OCR blocks of the page currently being read */}
            {panelTab === 'text' && (
              <div className="flex-1 flex flex-col min-h-0 min-w-0 w-full">
                {!currentOcrPage ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-2">
                    <Type className="w-8 h-8 text-muted-foreground/50" />
                    <p className="text-sm font-medium text-muted-foreground">Chưa có dữ liệu OCR</p>
                    <p className="text-xs text-muted-foreground">
                      Tải OCR ở tab Settings, sau đó các block chữ của trang này sẽ hiện ở đây.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* ── Toolbar ── */}
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-border flex-shrink-0">
                      <span className="text-[11px] text-muted-foreground flex-1">
                        Trang {currentPageIndex + 1} · {currentOcrPage.blocks.length} block
                      </span>
                      {isTokenizingAny && (
                        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                      )}
                    </div>

                    {/* ── Block list (current page only) ── */}
                    <ScrollArea className="flex-1 w-full [&>[data-radix-scroll-area-viewport]>div]:!block [&>[data-radix-scroll-area-viewport]]:!w-full">
                      <div ref={blockListRef} className="p-2 space-y-2 w-full max-w-full min-w-0">
                        {currentOcrPage.blocks.map((block, blockIdx) => {
                          const pageIdx = currentPageIndex;
                          const key = `${pageIdx}-${blockIdx}`;
                          const blockText = block.lines.join('');
                          const preview = block.lines[0]?.slice(0, 26) +
                            (block.lines[0]?.length > 26 || block.lines.length > 1 ? '…' : '');
                          const isSelected =
                            selectedBlock?.pageIdx === pageIdx &&
                            selectedBlock?.blockIdx === blockIdx;
                          const isExpanded = expandedBlock === key;
                          const trees = blockTrees(block);
                          const tokens = trees.length ? treesToTokens(trees) : blockTokens.get(key);
                          const isTokenizing = blockTokenizing.has(key);
                          const showArcs = arcBlocks.has(key);

                          return (
                            <div
                              key={key}
                              ref={(el) => {
                                if (el) blockItemRefs.current.set(key, el);
                                else blockItemRefs.current.delete(key);
                              }}
                              className={`rounded-lg border bg-card overflow-hidden transition-colors w-full ${
                                isSelected
                                  ? 'border-amber-400 ring-1 ring-amber-400/40'
                                  : 'border-border hover:border-primary/40'
                              }`}
                            >
                              {!isExpanded && (
                                <button
                                  type="button"
                                  className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-muted/40 transition-colors group min-w-0"
                                  onClick={() => {
                                    setExpandedBlock(key);
                                    setSelectedBlock({ pageIdx, blockIdx });
                                  }}
                                >
                                  <span className="flex-1 min-w-0 text-xs font-japanese truncate text-foreground/85">
                                    {preview}
                                  </span>
                                  {tokens && (
                                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500" title="Đã phân tích" />
                                  )}
                                  {isTokenizing && (
                                    <Loader2 className="flex-shrink-0 w-3 h-3 animate-spin text-muted-foreground" />
                                  )}
                                  <span className="flex-shrink-0 text-[10px] text-primary/80 group-hover:text-primary font-medium">
                                    xem thêm
                                  </span>
                                </button>
                              )}

                              {isExpanded && (
                                <div className="px-3 pt-2.5 pb-3 space-y-2 min-w-0">
                                  <div className="flex items-center justify-end gap-1 -mt-1 -mr-1">
                                    {trees.length > 0 && (
                                      <button
                                        type="button"
                                        className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded transition-colors ${
                                          showArcs
                                            ? 'bg-primary/15 text-primary'
                                            : 'text-primary hover:text-primary/80 hover:bg-primary/10'
                                        }`}
                                        onClick={() =>
                                          setArcBlocks((prev) => {
                                            const next = new Set(prev);
                                            if (next.has(key)) next.delete(key);
                                            else next.add(key);
                                            return next;
                                          })
                                        }
                                        title="Xem quan hệ ngữ pháp giữa các từ"
                                      >
                                        <Share2 className="w-3 h-3" />
                                        Cấu trúc
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                      onClick={() => copyToClipboard(blockText)}
                                      title="Sao chép"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                      onClick={() => setExpandedBlock(null)}
                                      title="Thu gọn"
                                    >
                                      <ChevronDown className="w-3.5 h-3.5 rotate-180" />
                                    </button>
                                  </div>

                                  {isTokenizing && !tokens && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang phân tích…
                                    </div>
                                  )}

                                  {!tokens && !isTokenizing && (
                                    <p
                                      className="text-sm font-japanese leading-relaxed text-foreground/90 whitespace-pre-wrap select-text"
                                      style={{
                                        fontFamily: '"Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif',
                                        wordBreak: 'break-all',
                                        overflowWrap: 'anywhere',
                                      }}
                                    >
                                      {blockText}
                                    </p>
                                  )}

                                  {tokens && <BlockTokenResult tokens={tokens} />}

                                  {showArcs && trees.length > 0 && (
                                    <DependencyArcsList sentences={trees} compact />
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </>
                )}
              </div>
            )}

            {/* Dictionary tab */}
            {panelTab === 'dictionary' && <DictionaryRightPanel />}
          </div>
          </>
        )}
      </div>

    </div>
  );
}
