import type { Transcript, TranscriptResult } from '@/lib/api/transcription';
import { TranscriptStatus } from '@/lib/api/transcription';

interface TranscriptViewerProps {
  transcript: Transcript;
  transcriptData: TranscriptResult | null;
}

export function TranscriptViewer({ transcript, transcriptData }: TranscriptViewerProps) {
  if (!transcriptData) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-foreground">{transcript.name}</h3>
        <span className="text-xs font-mono text-muted-foreground">
          {new Date(transcript.date_created).toLocaleDateString()}
        </span>
      </div>
      <div className="space-y-3">
        {transcriptData.segments.map((seg, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-xs font-mono text-muted-foreground w-6 flex-shrink-0 pt-1 text-right">
              {i + 1}
            </span>
            <p className="text-sm text-foreground leading-relaxed">
              {seg.words.map((w, j) => (
                <span
                  key={j}
                  className="token hover:bg-muted rounded px-0.5 cursor-pointer"
                  title={w.start !== null ? `${w.start.toFixed(1)}s` : ''}
                >
                  {w.token}{' '}
                </span>
              ))}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
