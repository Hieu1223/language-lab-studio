import { apiCall } from '../api-client';
import type { VideoPreview } from './transcription-real';
import type { MangaInfo } from './manga-real';

// Get featured/main page videos
export async function getFeaturedVideos(page: number = 1): Promise<{
  videos: VideoPreview[];
  total: number;
  page: number;
}> {
  return apiCall('/youtube/search', {
    method: 'GET',
    query: { q: 'popular', limit: 12, page },
  });
}

// Get featured/main page manga
export async function getFeaturedManga(page: number = 1): Promise<{
  manga: MangaInfo[];
  total: number;
  page: number;
}> {
  return apiCall('/manga/search', {
    method: 'GET',
    query: { query: 'popular', page, limit: 12 },
  });
}
