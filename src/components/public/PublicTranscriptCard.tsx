import type { PublicTranscript } from '@/lib/api/transcription';
import { Eye, User } from 'lucide-react';

interface Props {
  transcript: PublicTranscript;
}

export function PublicTranscriptCard({ transcript }: Props) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-colors cursor-pointer">
      <h3 className="font-medium text-foreground text-sm mb-2">{transcript.title}</h3>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {transcript.userName}</span>
        <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {transcript.viewCount}</span>
        <span className="font-mono">{new Date(transcript.createdAt).toLocaleDateString()}</span>
        <span className="px-1.5 py-0.5 rounded bg-muted font-mono uppercase text-[10px]">{transcript.language}</span>
      </div>
    </div>
  );
}
