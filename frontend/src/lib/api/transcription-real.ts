import { apiCall, getStoredToken } from '../api-client';

export interface VideoPreview {
  id: string;
  title: string;
  thumbnail_url: string | null;
  channel: {
    id: string;
    name: string | null;
    url: string | null;
  };
  duration: string | null;
  description: string | null;
  view_count: number | null;
}

export interface VideoInfo {
  id: string;
  title: string;
  thumbnail_url: string;
  channel: {
    id: string;
    name: string | null;
    url: string | null;
    follower_count: number | null;
    is_verified: boolean | null;
    description: string | null;
  };
  duration: number;
  view_count: number;
  upload_date: string | null;
  description: string | null;
}

export interface TranscriptSegment {
  text: string;
  words: Array<{
    token: string;
    start: number | null;
    end: number | null;
  }>;
}

export interface TranscriptResult {
  segments: TranscriptSegment[];
}

export interface TranscriptInfo {
  id: string;
  original_source: string;
  thumnail_url: string;
  resource_url: string;
  resource_id: string | null;
  status: number;
}

export interface UserHistoryItem {
  history_id: string;
  transcript_id: string;
  name: string;
  thumbnail_url: string;
  original_source: string;
  date_created: string;
  status: number;
}

// Search YouTube videos
export async function searchYouTube(query: string, limit: number = 10): Promise<VideoPreview[]> {
  return apiCall<VideoPreview[]>('/youtube/search', {
    method: 'GET',
    query: { q: query, limit },
  });
}

// Get YouTube video info
export async function getYouTubeVideo(videoId: string): Promise<VideoInfo> {
  return apiCall<VideoInfo>(`/youtube/video/${videoId}`, {
    method: 'GET',
  });
}

// Request transcription from YouTube
export async function requestTranscription(
  youtubeUrl: string,
  videoId: string,
  title: string,
  thumbnailUrl: string,
  userId: string,
  token?: string,
  isPublic: boolean = true
): Promise<{ transcript_id: string; success: boolean }> {
  const authToken = token || getStoredToken();
  if (!authToken) throw new Error('Not authenticated');

  console.log(
     {
        name: title,
        resource_id: videoId,
        original_source: 'Youtube',
        public: isPublic,
        thumbnail_url: thumbnailUrl,
        resource_url: youtubeUrl,
        user_id: userId,
      }
  )
  return apiCall<{ transcript_id: string; success: boolean }>(
    '/transcription/transcribe/youtube',
    {
      method: 'POST',
      token: authToken,
      body: {
        name: title,
        resource_id: videoId,
        original_source: 'Youtube',
        public: isPublic,
        thumbnail_url: thumbnailUrl,
        resource_url: youtubeUrl,
        user_id: userId,
      },
    }
  );
}

// Get transcript info
export async function getTranscriptInfo(
  transcriptId: string
): Promise<TranscriptInfo | null> {
  return apiCall<TranscriptInfo | null>(
    `/transcription/transcribe/${transcriptId}/info`,
    {
      method: 'GET',
    }
  );
}

// Get transcript data
export async function getTranscriptData(
  transcriptId: string
): Promise<TranscriptResult | null> {
  return apiCall<TranscriptResult | null>(
    `/transcription/transcribe/${transcriptId}/data`,
    {
      method: 'GET',
    }
  );
}

// Get user's transcription history
export async function getTranscriptionHistory(): Promise<UserHistoryItem[]> {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated');

  const response = await apiCall<{ items: UserHistoryItem[]; total: number }>(
    '/transcription/history',
    {
      method: 'GET',
      token,
    }
  );

  return response.items;
}

// Delete transcription history entry
export async function deleteTranscriptionHistory(historyId: string): Promise<void> {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated');

  await apiCall('/transcription/history', {
    method: 'DELETE',
    token,
    body: { history_id: historyId },
  });
}

// List public transcripts (paginated)
export async function listPublicTranscripts(
  page: number = 1,
  pageSize: number = 50,
): Promise<TranscriptInfo[]> {
  return apiCall<TranscriptInfo[]>('/transcription/transcribe', {
    method: 'GET',
    query: { page, page_size: pageSize },
  });
}

/**
 * Attempt to find an existing transcript by its YouTube video id
 * (stored server-side as `resource_id`). First checks user history
 * (if authenticated), then scans public transcripts.
 */
export async function findTranscriptByVideoId(
  videoId: string,
): Promise<TranscriptInfo | null> {
  const token = getStoredToken();

  // 1. Check user history first
  if (token) {
    try {
      const hist = await getTranscriptionHistory();
      // History items hold the transcript_id; we need info for resource_id
      for (const h of hist) {
        try {
          const info = await getTranscriptInfo(h.transcript_id);
          if (info && info.resource_id === videoId) return info;
        } catch {
          /* ignore individual failures */
        }
      }
    } catch {
      /* ignore */
    }
  }

  // 2. Scan first few pages of public transcripts
  const MAX_PAGES = 5;
  const PAGE_SIZE = 50;
  for (let p = 1; p <= MAX_PAGES; p++) {
    try {
      const items = await listPublicTranscripts(p, PAGE_SIZE);
      const found = items.find((t) => t.resource_id === videoId);
      if (found) return found;
      if (items.length < PAGE_SIZE) break;
    } catch {
      break;
    }
  }
  return null;
}

// Batch status check
export async function getBatchTranscriptStatus(
  ids: string[],
): Promise<Record<string, number>> {
  return apiCall<Record<string, number>>('/transcription/transcribe/status', {
    method: 'POST',
    body: ids,
  });
}
