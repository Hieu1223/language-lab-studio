import { useState } from 'react';
import { Copy, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateBookmarkletCode, getCurrentAppUrl } from '@/lib/bookmarklet';
import { toast } from 'sonner';

interface BookmarkletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BookmarkletModal({ isOpen, onClose }: BookmarkletModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const appUrl = getCurrentAppUrl();
  const bookmarkletCode = generateBookmarkletCode({ appUrl });

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(bookmarkletCode);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg">Add Bookmarklet</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Quick access from YouTube videos to this app
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Step 1: Copy */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                1
              </span>
              Copy the Bookmarklet Code
            </h3>
            <p className="text-sm text-muted-foreground">
              Click the button below to copy the bookmarklet code to your clipboard.
            </p>
            <div className="bg-muted/50 border rounded-lg p-4">
              <code className="text-xs text-muted-foreground break-all font-mono">
                {bookmarkletCode.substring(0, 100)}...
              </code>
            </div>
            <Button
              onClick={handleCopyCode}
              className="w-full gap-2"
              variant={copied ? 'default' : 'outline'}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Bookmarklet Code
                </>
              )}
            </Button>
          </div>

          <div className="border-t" />

          {/* Step 2: Add to Bookmarks */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                2
              </span>
              Add to Your Bookmarks
            </h3>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 space-y-3">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Chrome / Edge:</p>
                <ol className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>1. Press <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+Shift+B</kbd> (Windows) or <kbd className="px-2 py-1 bg-muted rounded text-xs">Cmd+Shift+B</kbd> (Mac) to open Bookmark Manager</li>
                  <li>2. Click the menu icon (⋮) and select "Add new bookmark"</li>
                  <li>3. Give it a name like "YouTube → Learning Lab"</li>
                  <li>4. In the URL field, paste the copied bookmarklet code</li>
                  <li>5. Click Save</li>
                </ol>
              </div>

              <div className="border-t border-blue-500/20 pt-3 space-y-2">
                <p className="text-sm font-medium text-foreground">Firefox:</p>
                <ol className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>1. Right-click on your bookmarks toolbar (or press <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+B</kbd>)</li>
                  <li>2. Select "Add Bookmark"</li>
                  <li>3. Name it "YouTube → Learning Lab"</li>
                  <li>4. Paste the bookmarklet code in the Location field</li>
                  <li>5. Click Add</li>
                </ol>
              </div>

              <div className="border-t border-blue-500/20 pt-3 space-y-2">
                <p className="text-sm font-medium text-foreground">Safari:</p>
                <ol className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>1. From menu, select Bookmarks → Edit Bookmarks</li>
                  <li>2. Click the "+" button to add a new bookmark</li>
                  <li>3. Name it "YouTube → Learning Lab"</li>
                  <li>4. Paste the bookmarklet code in the Address field</li>
                  <li>5. Save to Favorites</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="border-t" />

          {/* Step 3: Use */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                3
              </span>
              Use It on Any YouTube Video
            </h3>
            <p className="text-sm text-muted-foreground">
              Visit any YouTube video page and click the "YouTube → Learning Lab" bookmarklet. It will open the video in our app so you can:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
              <li>Request a transcript with timestamps</li>
              <li>Practice with interactive cloze deletion</li>
              <li>Study Japanese vocabulary from real videos</li>
            </ul>
          </div>

          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <p className="text-sm text-green-700 dark:text-green-400">
              ✓ You're all set! The bookmarklet is now available whenever you're watching YouTube.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t px-6 py-4 flex justify-end">
          <Button onClick={onClose} variant="default">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
