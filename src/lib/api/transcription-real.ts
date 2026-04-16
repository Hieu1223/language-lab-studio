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
  isPublic: boolean = true
): Promise<{ transcript_id: string; success: boolean }> {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated');

  return apiCall<{ transcript_id: string; success: boolean }>(
    '/transcription/transcribe/youtube',
    {
      method: 'POST',
      token,
      body: {
        name: title,
        resource_id: videoId,
        original_source: 'Youtube',
        public: isPublic,
        thumbnail_url: thumbnailUrl,
        resource_url: youtubeUrl,
        user_id: 'current-user', // This should be replaced with actual user ID
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
