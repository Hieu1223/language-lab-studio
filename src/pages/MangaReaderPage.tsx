import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingScreen } from '@/components/LoadingScreen';
import { OCROverlay } from '@/components/manga/OCROverlay';
import {
  getChapterImages,
  getOCRData,
  type OCRPage,
} from '@/lib/api/manga-real';
import { toast } from 'sonner';

export default function MangaReaderPage() {
  const { mangaId, chapterUrl } = useParams<{
    mangaId: string;
    chapterUrl: string;
  }>();
  const navigate = useNavigate();

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const [ocrDataPages, setOcrDataPages] = useState<(OCRPage | null)[]>([]);
  const [pageOCREnabled, setPageOCREnabled] = useState<Set<number>>(new Set());
  const [allOCREnabled, setAllOCREnabled] = useState(false);
  const [loadingImages, setLoadingImages] = useState(true);
  const [loadingOCR, setLoadingOCR] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  const currentImage = images[currentPageIndex];
  const currentOCR =
    pageOCREnabled.has(currentPageIndex) && ocrDataPages[currentPageIndex]
      ? ocrDataPages[currentPageIndex]
      : null;

  // Load images on mount
  useEffect(() => {
    /*
    if (!mangaId || !chapterUrl) {
      navigate('/manga');
      return;
    }
      */
    console.log(mangaId)
    console.log(chapterUrl)

    const loadImages = async () => {
      try {
        setLoadingImages(true);
        // Note: In real implementation, you'd pass the actual chapter URL
        const imageUrls = await getChapterImages(chapterUrl);
        setImages(imageUrls);
        setOcrDataPages(new Array(imageUrls.length).fill(null));
      } catch (error) {
        toast.error('Failed to load chapter images');
        console.error(error);
        navigate(`/manga/${mangaId}`);
      } finally {
        setLoadingImages(false);
      }
    };

    loadImages();
  }, [mangaId, chapterUrl, navigate]);

  const loadOCRForPage = async (pageIndex: number) => {
    if (ocrDataPages[pageIndex]) return; // Already loaded

    try {
      setLoadingOCR(true);
      const ocrData = await getOCRData(chapterUrl);

      // Update the OCR data for this page
      const newPages = [...ocrDataPages];
      newPages[pageIndex] = ocrData.pages[pageIndex] || null;
      setOcrDataPages(newPages);

      // Enable OCR for this page
      setPageOCREnabled((prev) => new Set(prev).add(pageIndex));
    } catch (error) {
      toast.error('Failed to load OCR data');
      console.error(error);
    } finally {
      setLoadingOCR(false);
    }
  };

  const loadAllOCR = async () => {
    try {
      setLoadingOCR(true);
      const ocrData = await getOCRData(chapterUrl);
      setOcrDataPages(ocrData.pages);
      setPageOCREnabled(new Set(Array.from({ length: images.length }, (_, i) => i)));
      setAllOCREnabled(true);
    } catch (error) {
      toast.error('Failed to load OCR data');
      console.error(error);
    } finally {
      setLoadingOCR(false);
    }
  };

  const handlePreviousPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPageIndex < images.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1);
    }
  };

  if (loadingImages) {
    return (
      <LoadingScreen
        isOpen={true}
        message="Loading chapter..."
      />
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground">No images found</p>
        <Button onClick={() => navigate(`/manga/${mangaId}`)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <LoadingScreen
        isOpen={loadingOCR}
        message="Processing OCR..."
      />

      {/* Header */}
      <div className="border-b border-border p-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="font-bold text-lg text-foreground">
            Chapter {chapterUrl}
          </h1>
          <p className="text-sm text-muted-foreground">
            Page {currentPageIndex + 1} of {images.length}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/manga/${mangaId}`)}>
          ← Back to Chapters
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden gap-4 p-4">
        {/* Image Viewer - Full Height */}
        <div className="flex-1 bg-black rounded-lg overflow-auto flex items-center justify-center relative">
          {currentImage && (
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={currentImage}
                alt={`Page ${currentPageIndex + 1}`}
                className="max-w-full h-full object-contain"
              />
              {currentOCR && (
                <OCROverlay
                  ocrData={currentOCR}
                  imageWidth={800} // Default width, adjust based on actual image
                  imageHeight={1000} // Default height, adjust based on actual image
                  showOCR={pageOCREnabled.has(currentPageIndex)}
                />
              )}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-col gap-2 justify-center flex-shrink-0">
          <Button
            onClick={handlePreviousPage}
            disabled={currentPageIndex === 0}
            size="lg"
            variant="outline"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            onClick={handleNextPage}
            disabled={currentPageIndex === images.length - 1}
            size="lg"
            variant="outline"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Right Panel */}
        {rightPanelOpen && (
          <div className="w-64 bg-card border border-border rounded-lg p-4 overflow-y-auto flex flex-col gap-4 flex-shrink-0">
            <div>
              <h3 className="font-semibold text-sm text-foreground mb-3">
                OCR Settings
              </h3>

              <div className="space-y-2">
                <Button
                  onClick={() => loadOCRForPage(currentPageIndex)}
                  disabled={
                    loadingOCR ||
                    pageOCREnabled.has(currentPageIndex)
                  }
                  size="sm"
                  className="w-full"
                >
                  {loadingOCR ? (
                    <>
                      <span className="inline-block w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                      Loading...
                    </>
                  ) : pageOCREnabled.has(currentPageIndex) ? (
                    'OCR Enabled'
                  ) : (
                    'Enable OCR This Page'
                  )}
                </Button>

                <Button
                  onClick={loadAllOCR}
                  disabled={loadingOCR || allOCREnabled}
                  size="sm"
                  variant="outline"
                  className="w-full"
                >
                  {allOCREnabled ? 'All Pages OCR On' : 'Enable All Pages OCR'}
                </Button>
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <h3 className="font-semibold text-xs text-muted-foreground mb-2">
                ENABLED PAGES
              </h3>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: images.length }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (pageOCREnabled.has(i)) {
                        const newSet = new Set(pageOCREnabled);
                        newSet.delete(i);
                        setPageOCREnabled(newSet);
                      }
                    }}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      pageOCREnabled.has(i)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                    title={`Page ${i + 1}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
